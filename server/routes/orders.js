const express = require('express');
const Order = require('../models/Order');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.session.userId }).sort({ createdAt: -1 });
  res.json({ orders });
});

router.post('/', requireAuth, async (req, res) => {
  const { productId, name, category, size, from, to, days, total } = req.body || {};
  if (!name || !size || !from || !to || !days || !total) {
    return res.status(400).json({ error: 'Missing required order fields.' });
  }
  const order = await Order.create({
    user: req.session.userId,
    productId,
    name,
    category,
    size,
    from,
    to,
    days,
    total,
    status: 'confirmed',
  });
  res.status(201).json({ order });
});

module.exports = router;
