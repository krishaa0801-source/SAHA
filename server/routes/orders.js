const express = require('express');
const Order = require('../models/Order');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Orders are only ever created server-side, as a direct result of a
// verified Razorpay payment — see POST /api/payments/verify-payment.
// There is intentionally no POST route here: an endpoint that created an
// order from client-supplied fields (name/total/etc.) is exactly the
// trust-the-client hole this redesign removes.
router.get('/', requireAuth, async (req, res) => {
  try {
    // depositNote is an internal admin reason (see routes/admin/orders.js)
    // — never sent to the customer who placed the order.
    const orders = await Order.find({ user: req.session.userId }).select('-depositNote').sort({ createdAt: -1 }).lean();
    res.json({
      // rentalTotal/depositStatus/etc. were added to the schema after
      // real orders already existed — those older documents were never
      // backfilled, so the fields are genuinely absent, not just falsy.
      // `total` existed from day one, so it's the right stand-in for
      // rentalTotal on a pre-deposit order (the deposit really was 0
      // then). Without this, the account page would show "₹NaN" for
      // anyone's order placed before security deposits existed.
      orders: orders.map((o) => ({
        ...o,
        rentalTotal: o.rentalTotal ?? o.total ?? 0,
        securityDeposit: o.securityDeposit ?? 0,
        total: o.total ?? 0,
        depositStatus: o.depositStatus ?? 'pending',
        depositRefundAmount: o.depositRefundAmount ?? 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your rentals. Please try again.' });
  }
});

module.exports = router;
