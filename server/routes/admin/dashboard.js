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
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
      Product.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      totalProducts,
      availableProducts,
      currentlyRentedProducts: rentedToday.length,
      totalCategories,
      recentOrders,
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
