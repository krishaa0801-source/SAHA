const express = require('express');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const Order = require('../../models/Order');
const handleValidationErrors = require('../../middleware/validate');
const logger = require('../../utils/logger');

const router = express.Router();

const ORDER_STATUSES = ['confirmed', 'completed', 'cancelled'];
const DEPOSIT_ACTIONS = ['refund_full', 'refund_partial', 'forfeit'];

// depositNote is intentionally included here — this is the admin-only
// surface. Customers never see it (see routes/orders.js's .select('-depositNote')).
//
// basePrice/tierMultiplier/tierLabel/rentalTotal/depositStatus/etc. were
// added to the schema after this app already had real orders in
// production — those older documents were never backfilled, so the
// fields are genuinely absent (not just falsy) on them. `.lean()` skips
// schema defaults entirely, so without these fallbacks the admin UI's
// `.toLocaleString()` calls crash on any pre-migration order. `total`
// existed from day one, so it's the correct stand-in for `rentalTotal`
// on an order from before security deposits existed (the deposit really
// was 0 then).
function toAdminOrder(order) {
  return {
    id: order._id,
    user: order.user,
    productId: order.productId,
    name: order.name,
    category: order.category,
    size: order.size,
    from: order.from,
    to: order.to,
    days: order.days,
    basePrice: order.basePrice ?? 0,
    tierMultiplier: order.tierMultiplier ?? 1,
    tierLabel: order.tierLabel ?? '—',
    rentalTotal: order.rentalTotal ?? order.total ?? 0,
    securityDeposit: order.securityDeposit ?? 0,
    total: order.total ?? 0,
    status: order.status,
    depositStatus: order.depositStatus ?? 'pending',
    depositRefundAmount: order.depositRefundAmount ?? 0,
    depositNote: order.depositNote ?? '',
    razorpayOrderId: order.razorpayOrderId,
    razorpayPaymentId: order.razorpayPaymentId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

// Read-only list — orders are only ever created from a verified payment
// (see routes/payments.js), never from this admin surface.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.depositStatus) filter.depositStatus = req.query.depositStatus;
    // Deep-link support for the dashboard's "Recent Orders" — clicking one
    // lands here filtered to just that order instead of the whole list.
    // An invalid id just yields zero results rather than a 500.
    if (req.query.orderId && mongoose.Types.ObjectId.isValid(req.query.orderId)) {
      filter._id = req.query.orderId;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'fname lname email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders: orders.map((o) => ({
        ...toAdminOrder(o),
        user: o.user ? { id: o.user._id, name: `${o.user.fname} ${o.user.lname}`.trim(), email: o.user.email } : null,
      })),
      total,
      page,
      limit,
    });
  } catch (err) {
    logger.error('List admin orders error:', err);
    res.status(500).json({ error: 'Could not load orders. Please try again.' });
  }
});

// Marks an order completed (return processed) or cancelled — the only
// status transition this app has, since there's otherwise no way for an
// order to ever leave 'confirmed'. Deposit management below is gated on
// status === 'completed', so this is the necessary first step for it.
router.patch(
  '/:id/status',
  [body('status').isIn(ORDER_STATUSES).withMessage('Invalid status.')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      order.status = req.body.status;
      await order.save();
      res.json({ order: toAdminOrder(order) });
    } catch (err) {
      logger.error('Update order status error:', err);
      res.status(500).json({ error: 'Could not update the order. Please try again.' });
    }
  }
);

// Refund/forfeit the security deposit — a record-keeping decision, not a
// live payment gateway call (no Razorpay refund is issued here; the
// actual money movement, if any, happens outside this app and this just
// tracks what was decided and why). Only allowed once the order is
// 'completed' — a deposit can't be resolved before the rental's returned.
const depositValidators = [
  body('action').isIn(DEPOSIT_ACTIONS).withMessage('Invalid deposit action.'),
  body('reason').isString().trim().notEmpty().isLength({ max: 500 }).withMessage('An internal reason is required.'),
  body('amount')
    .if(body('action').equals('refund_partial'))
    .isFloat({ gt: 0 })
    .withMessage('Refund amount must be greater than 0.'),
];

router.post('/:id/deposit', depositValidators, handleValidationErrors, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'Mark the order completed before managing its security deposit.' });
    }

    const { action, reason } = req.body;
    if (action === 'refund_full') {
      order.depositStatus = 'refunded';
      order.depositRefundAmount = order.securityDeposit;
    } else if (action === 'forfeit') {
      order.depositStatus = 'forfeited';
      order.depositRefundAmount = 0;
    } else {
      const amount = Number(req.body.amount);
      if (amount > order.securityDeposit) {
        return res.status(400).json({ error: `Refund amount can't exceed the ₹${order.securityDeposit} deposit.` });
      }
      order.depositStatus = 'partially_refunded';
      order.depositRefundAmount = amount;
    }
    order.depositNote = String(reason).trim();

    await order.save();
    res.json({ order: toAdminOrder(order) });
  } catch (err) {
    logger.error('Update order deposit error:', err);
    res.status(500).json({ error: 'Could not update the deposit. Please try again.' });
  }
});

module.exports = router;
