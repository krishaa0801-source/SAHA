const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const requireAuth = require('../middleware/requireAuth');
const { resolveCart } = require('../services/cartResolver');
const { findValidCoupon } = require('../services/couponService');
const { reserveBooking, hasOverlap } = require('../services/booking');
const { paymentLimiter } = require('../middleware/rateLimiters');
const logger = require('../utils/logger');

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Public key id only — safe to expose, needed by the frontend to open the checkout modal.
router.get('/key', (req, res) => {
  res.json({ key_id: process.env.RAZORPAY_KEY_ID });
});

// Takes NO amount/currency/receipt from the client. The amount charged is
// always derived from the signed-in user's own cart, re-priced from
// MongoDB right here — there is no request field that can move this
// number.
router.post('/create-order', paymentLimiter, requireAuth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.session.userId });
    if (!cart || !cart.items.length) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const { lines, totals } = await resolveCart(cart);
    if (!lines.length) {
      return res.status(400).json({ error: 'None of the items in your cart are available anymore.' });
    }

    // Second early checkpoint: catch a since-booked conflict before any
    // money moves. Still not the race-condition guard — that's
    // reserveBooking() inside verify-payment's transaction.
    for (const l of lines) {
      if (await hasOverlap(l.productId, l.from, l.to)) {
        return res.status(409).json({ error: `${l.name} is no longer available for the selected dates.` });
      }
    }

    const amount = Math.round(totals.total * 100); // paise
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `saha_${Date.now()}`, // Razorpay caps receipt at 40 chars
    });

    // Recorded before the client ever sees the order id — this is the
    // one thing verify-payment is allowed to flip from 'created' to
    // 'paid', and only once. If checkout is abandoned this just sits as
    // 'created' forever, which is fine.
    await Payment.create({
      user: req.session.userId,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
    });

    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, summary: totals });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(401).json({ error: 'Razorpay authentication failed.' });
    }
    logger.error('Razorpay create-order error:', err);
    res.status(500).json({ error: 'Failed to create payment order.' });
  }
});

// Shared by /verify-payment and /webhook: once a Payment document has been
// atomically claimed (created -> paid), this does the actual fulfillment —
// re-resolve the cart, create Order documents, reserve the booked dates,
// redeem the coupon, and clear the cart, all inside one transaction. The
// caller has already verified authenticity (checkout signature or webhook
// HMAC) and claimed the Payment before this runs.
//
// Throws with `err.isBookingConflict` set if a date got booked out from
// under the paid order — callers must treat that as "payment succeeded,
// fulfillment needs a human," never as a failed payment.
async function fulfillPayment({ userId, razorpayOrderId, razorpayPaymentId }) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart || !cart.items.length) {
    // Payment is genuinely verified and claimed, but there's nothing left
    // to fulfill (e.g. the webhook arrives after /verify-payment already
    // fulfilled and cleared the cart) — not an error.
    return [];
  }

  const { lines } = await resolveCart(cart);
  // Captured after resolveCart, which already self-heals an invalid
  // stored coupon (see services/cartResolver.js) — so this is only ever a
  // code that was valid as of this exact moment.
  const appliedCouponCode = cart.coupon;

  // Order creation, booking reservation, and clearing the cart all happen
  // in one MongoDB transaction: if ANY line's dates have been booked out
  // from under us since the cart was priced, everything rolls back
  // together — no orphaned Order with no Booking, no partially emptied
  // cart. The payment itself already happened and stays marked 'paid'
  // regardless — see each caller's isBookingConflict handling for why
  // that's the right call.
  const session = await mongoose.startSession();
  let orders = [];
  try {
    await session.withTransaction(async () => {
      orders = [];
      for (const l of lines) {
        const [order] = await Order.create(
          [
            {
              user: userId,
              productId: l.productId,
              name: l.name,
              category: l.category,
              size: l.size,
              from: l.from,
              to: l.to,
              days: l.days,
              basePrice: l.basePrice,
              tierMultiplier: l.tierMultiplier,
              tierLabel: l.tierLabel,
              total: l.lineTotal,
              status: 'confirmed',
              razorpayOrderId,
              razorpayPaymentId,
            },
          ],
          { session }
        );

        // The actual race-safe availability check + reservation — see
        // services/booking.js. Throws (aborting this whole transaction)
        // if any day in the range was booked by someone else in the
        // meantime.
        await reserveBooking({
          session,
          productId: l.productId,
          userId,
          from: l.from,
          to: l.to,
          orderId: order._id,
        });

        orders.push(order);
      }

      // Redemption is counted here, atomically with order creation, so a
      // usage-limited code can never be over-redeemed by a race. This is
      // a best-effort re-check, not a guard that can abort the
      // transaction: by this point Razorpay has genuinely been charged
      // and the rental is being fulfilled, so an extremely narrow race
      // (someone else exhausting the limit between create-order and
      // here) just means this one redemption silently isn't counted —
      // never worth unwinding an already-paid order over.
      if (appliedCouponCode) {
        const base = lines.reduce((sum, l) => sum + l.lineSubtotal + l.lineRentalCharge, 0);
        const { coupon } = await findValidCoupon(appliedCouponCode, {
          userId,
          base,
          cartProductIds: lines.map((l) => l.productId),
          cartCategorySlugs: lines.map((l) => l.category),
        });
        if (coupon) {
          await Coupon.updateOne(
            { _id: coupon._id },
            { $inc: { usedCount: 1 }, $addToSet: { usedByUsers: userId } },
            { session }
          );
        }
      }

      cart.items = [];
      cart.coupon = '';
      await cart.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return orders;
}

// Verifies the Razorpay signature, then — and only then — creates the
// Order documents itself from the user's current cart, re-priced fresh
// from MongoDB. The client never gets to say what an order is worth; it
// only ever gets told what verification/creation succeeded.
router.post('/verify-payment', paymentLimiter, requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(razorpay_signature));

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Payment signature verification failed.' });
    }

    // Atomically claim this payment: the update only matches a Payment
    // that (a) exists, (b) belongs to THIS signed-in user, and (c) is
    // still 'created'. That third condition is what makes replay
    // impossible — resubmitting an already-used (even genuinely valid)
    // order_id/payment_id/signature triple finds no matching document
    // and is rejected, whether it's replayed by the same user against a
    // refilled cart or by a different account entirely. It's also what
    // makes this safe to race against the /webhook fallback below —
    // whichever of the two gets here first wins the claim, the other
    // finds nothing to claim and no-ops.
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.session.userId, status: 'created' },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, paidAt: new Date() },
      { new: true }
    );

    if (!payment) {
      return res.status(400).json({ success: false, error: 'This payment has already been processed or is invalid.' });
    }

    let orders;
    try {
      orders = await fulfillPayment({
        userId: req.session.userId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      });
    } catch (err) {
      if (err.isBookingConflict) {
        // Payment was real and stays 'paid' (see Payment.findOneAndUpdate
        // above) — it's fulfillment that failed, not the charge. There is
        // no automated refund flow yet, so this needs a human: the error
        // message says so explicitly rather than pretending it's fine.
        return res.status(409).json({
          success: false,
          error: `Payment received, but ${err.message} Please contact support for a refund — reference payment ${razorpay_payment_id}.`,
        });
      }
      throw err;
    }

    res.json({ success: true, orders });
  } catch (err) {
    logger.error('verify-payment error:', err);
    res.status(500).json({ error: 'Payment succeeded but we could not save your rental. Please contact support.' });
  }
});

// Fallback confirmation path for the gap /verify-payment can't cover: if
// the browser tab closes/crashes/loses network after Razorpay captures the
// charge but before the client's /verify-payment call completes, nothing
// would otherwise ever create the Order — the Payment just sits 'created'
// forever despite money having moved. Razorpay calls this URL server-to-
// server on payment.captured regardless of what the browser does, so it
// closes that gap.
//
// Authenticated by HMAC over the raw request body (req.rawBody, captured
// by server.js's express.json() verify callback) using a webhook-specific
// secret from the Razorpay Dashboard — deliberately NOT the checkout
// key_secret, so a leak of one doesn't compromise the other. Exempted from
// the app's usual CSRF header check (server/middleware/csrf.js) since this
// is a server-to-server call with no browser/cookie involved to forge.
router.post('/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      // Not configured yet — fail loudly server-side (visible in logs and
      // as a non-2xx in the Razorpay Dashboard's webhook delivery log) so
      // it gets noticed and fixed, rather than silently accepting
      // unverifiable requests.
      logger.error('Razorpay webhook called but RAZORPAY_WEBHOOK_SECRET is not set.');
      return res.status(500).json({ error: 'Webhook not configured.' });
    }

    const signature = req.get('x-razorpay-signature');
    if (!signature || !req.rawBody) {
      return res.status(400).json({ error: 'Missing webhook signature.' });
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    const isValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const { event, payload } = req.body || {};
    if (event !== 'payment.captured') {
      // We only act on captures; everything else is acknowledged and
      // ignored so Razorpay doesn't keep retrying events we don't need.
      return res.json({ received: true });
    }

    const paymentEntity = payload && payload.payment && payload.payment.entity;
    const razorpayOrderId = paymentEntity && paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity && paymentEntity.id;
    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ error: 'Malformed payment.captured payload.' });
    }

    // Same atomic claim as /verify-payment, keyed on razorpayOrderId alone
    // (it's unique) since a webhook has no session to scope by user. If
    // /verify-payment already won this race, status is no longer
    // 'created' and this just no-ops — the common case, since the browser
    // round-trip usually finishes before Razorpay's webhook arrives.
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId, status: 'created' },
      { status: 'paid', razorpayPaymentId, paidAt: new Date() },
      { new: true }
    );

    if (!payment) {
      return res.json({ received: true });
    }

    try {
      await fulfillPayment({ userId: payment.user, razorpayOrderId, razorpayPaymentId });
    } catch (err) {
      if (err.isBookingConflict) {
        // No browser waiting on a webhook — this needs a human to notice
        // and refund, so it has to be loud in the logs.
        logger.error(
          `Webhook fulfillment conflict: payment ${razorpayPaymentId} (order ${razorpayOrderId}) captured but booking failed — ${err.message} Needs manual refund.`
        );
        return res.json({ received: true });
      }
      throw err;
    }

    res.json({ received: true });
  } catch (err) {
    logger.error('Razorpay webhook error:', err);
    // 200 here would make Razorpay stop retrying a delivery we failed to
    // process for a reason that might be transient (e.g. a DB hiccup) —
    // let it retry.
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

module.exports = router;
