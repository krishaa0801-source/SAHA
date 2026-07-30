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
    // refilled cart or by a different account entirely.
    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id, user: req.session.userId, status: 'created' },
      { status: 'paid', razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, paidAt: new Date() },
      { new: true }
    );

    if (!payment) {
      return res.status(400).json({ success: false, error: 'This payment has already been processed or is invalid.' });
    }

    const cart = await Cart.findOne({ user: req.session.userId });
    if (!cart || !cart.items.length) {
      // Payment is genuinely verified and claimed, but there's nothing
      // left to fulfill (e.g. a duplicate submit after the first call
      // already cleared the cart) — not an error from the client's POV.
      return res.json({ success: true, orders: [] });
    }

    const { lines } = await resolveCart(cart);
    // Captured after resolveCart, which already self-heals an invalid
    // stored coupon (see services/cartResolver.js) — so this is only
    // ever a code that was valid as of this exact moment.
    const appliedCouponCode = cart.coupon;

    // Order creation, booking reservation, and clearing the cart all
    // happen in one MongoDB transaction: if ANY line's dates have been
    // booked out from under us since the cart was priced (the narrow
    // window between create-order and getting here), everything rolls
    // back together — no orphaned Order with no Booking, no partially
    // emptied cart. The payment itself (see the Payment claim above)
    // already happened and stays marked 'paid' regardless — see the
    // catch block below for why that's the right call.
    const session = await mongoose.startSession();
    let orders = [];
    try {
      await session.withTransaction(async () => {
        orders = [];
        for (const l of lines) {
          const [order] = await Order.create(
            [
              {
                user: req.session.userId,
                productId: l.productId,
                name: l.name,
                category: l.category,
                size: l.size,
                from: l.from,
                to: l.to,
                days: l.days,
                total: l.lineTotal,
                status: 'confirmed',
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
              },
            ],
            { session }
          );

          // The actual race-safe availability check + reservation — see
          // services/booking.js. Throws (aborting this whole
          // transaction) if any day in the range was booked by someone
          // else in the meantime.
          await reserveBooking({
            session,
            productId: l.productId,
            userId: req.session.userId,
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
            userId: req.session.userId,
            base,
            cartProductIds: lines.map((l) => l.productId),
            cartCategorySlugs: lines.map((l) => l.category),
          });
          if (coupon) {
            await Coupon.updateOne(
              { _id: coupon._id },
              { $inc: { usedCount: 1 }, $addToSet: { usedByUsers: req.session.userId } },
              { session }
            );
          }
        }

        cart.items = [];
        cart.coupon = '';
        await cart.save({ session });
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
    } finally {
      await session.endSession();
    }

    res.json({ success: true, orders });
  } catch (err) {
    logger.error('verify-payment error:', err);
    res.status(500).json({ error: 'Payment succeeded but we could not save your rental. Please contact support.' });
  }
});

module.exports = router;
