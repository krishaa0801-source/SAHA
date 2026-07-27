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
    const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: 'Could not load your rentals. Please try again.' });
  }
});

module.exports = router;
