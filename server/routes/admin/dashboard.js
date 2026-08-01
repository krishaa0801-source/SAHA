const express = require('express');
const Product = require('../../models/Product');
const Category = require('../../models/Category');
const Order = require('../../models/Order');
const BookedDate = require('../../models/BookedDate');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  try {
    const [
      totalProducts,
      availableProducts,
      totalCategories,
      rentedToday,
      recentOrders,
      recentlyAddedProducts,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: 'available' }),
      Category.countDocuments({}),
      // "Currently rented" is computed from the real booking calendar
      // (server/services/booking.js), not the admin-settable `status`
      // flag, so this number always reflects actual rentals in progress.
      BookedDate.distinct('productId', { date: todayStr() }),
      // Real orders only — capped at 5, never the full collection. Only
      // the fields this widget actually renders, plus a populated
      // customer name (Order stores `user` as an ObjectId ref, not a
      // denormalized name — see models/Order.js).
      Order.find()
        .select('name size from to status total createdAt user')
        .populate('user', 'fname lname')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Product.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      totalProducts,
      availableProducts,
      currentlyRentedProducts: rentedToday.length,
      totalCategories,
      recentOrders: recentOrders.map((o) => ({
        _id: o._id,
        name: o.name,
        size: o.size,
        from: o.from,
        to: o.to,
        status: o.status,
        total: o.total,
        createdAt: o.createdAt,
        // A deleted user still leaves the order intact — never let a
        // missing ref break this widget.
        customerName: o.user ? `${o.user.fname} ${o.user.lname}`.trim() : 'Deleted user',
      })),
      recentlyAddedProducts: recentlyAddedProducts.map((p) => ({
        id: p._id,
        name: p.name,
        category: p.category,
        price: p.price,
        image: p.image,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load the dashboard. Please try again.' });
  }
});

module.exports = router;
