const express = require('express');
const Review = require('../models/Review');
const Product = require('../models/Product');

const router = express.Router();

// Public, site-wide feed of approved reviews — powers the "Spotted in
// Saha's" carousel on the home page (public/index.html). "Approved" means
// published: true, same moderation flag the admin panel already uses
// (server/routes/admin/reviews.js) — this never returns a hidden review.
// Featured reviews surface first, then newest. `.select()` on both
// queries keeps this to only the fields the carousel actually renders.
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const reviews = await Review.find({ published: true })
      .select('product customerName customerImage rating text reviewDate')
      .sort({ featured: -1, reviewDate: -1 })
      .limit(limit)
      .lean();

    // Review doesn't denormalize the product name (see models/Review.js) —
    // one small batched lookup instead of N+1 queries.
    const productIds = [...new Set(reviews.map((r) => r.product))];
    const products = await Product.find({ _id: { $in: productIds } }).select('name').lean();
    const nameById = new Map(products.map((p) => [p._id, p.name]));

    // Short, public cache: this list changes only when an admin
    // publishes/edits a review, and a stale minute is a fine trade for
    // not re-querying on every home page load.
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      reviews: reviews.map((r) => ({
        id: r._id,
        customerName: r.customerName,
        customerImage: r.customerImage,
        rating: r.rating,
        text: r.text,
        reviewDate: r.reviewDate,
        productName: nameById.get(r.product) || '',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews. Please try again.' });
  }
});

module.exports = router;
