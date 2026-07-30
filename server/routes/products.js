const express = require('express');
const Product = require('../models/Product');
const Review = require('../models/Review');
const { getMonthAvailability } = require('../services/booking');
const { buildProductFilter, buildProductSort } = require('../services/productQuery');
const { getDetailImage } = require('../utils/productImage');

const router = express.Router();

// Shapes a Product doc for public consumption: `sizes` becomes
// [{size, available}] (available = quantity > 0 — see models/Product.js
// for why quantity itself is never exposed to shoppers), and the first
// gallery image doubles as the detail/thumbnail photo, matching the "first
// image becomes thumbnail automatically" rule.
function toPublicProduct(product) {
  const gallery = [...product.galleryImages].sort((a, b) => a.order - b.order);
  return {
    id: product._id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: product.description,
    price: product.price,
    sizes: product.sizes.map((s) => ({ size: s.size, available: s.quantity > 0 })),
    image: product.image,
    detailImage: getDetailImage(product),
    galleryImages: gallery.map((g) => ({ url: g.url, thumbnailUrl: g.thumbnailUrl })),
    status: product.status,
    rating: product.rating || { average: 0, count: 0 },
    createdAt: product.createdAt,
  };
}

// Public — this is what public/vault.html fetches instead of the old
// catalog-data.js generator. Never returns a hidden product.
router.get('/', async (req, res) => {
  try {
    const filter = buildProductFilter(req.query, { includeHidden: false });
    const sort = buildProductSort(req.query.sort);
    // Defensive cap, not real pagination — the Style Vault groups every
    // result into rods client-side in one pass, so this is a safety net
    // against unbounded growth rather than a UX with "load more".
    const products = await Product.find(filter).sort(sort).limit(500).lean();
    res.json({ products: products.map((p) => toPublicProduct(p)) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load products. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, status: { $ne: 'hidden' } }).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ product: toPublicProduct(product) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load this product. Please try again.' });
  }
});

// Public — every published review for one product, featured first, then
// newest. Powers the star rating + review list on the product sidebar
// (public/vault.html openSidebar()).
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id, published: true })
      .sort({ featured: -1, reviewDate: -1 })
      .lean();
    res.json({
      reviews: reviews.map((r) => ({
        id: r._id,
        customerName: r.customerName,
        customerImage: r.customerImage,
        rating: r.rating,
        title: r.title,
        text: r.text,
        reviewDate: r.reviewDate,
        verified: r.verified,
        featured: r.featured,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not load reviews. Please try again.' });
  }
});

// Public — browsing availability doesn't require being signed in.
// Returns every day of the requested month with its real booking
// status, backed by MongoDB (see services/booking.js) instead of the
// old client-side random mock.
router.get('/:id/availability', async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, status: { $ne: 'hidden' } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10); // 1-12 in the URL, human-friendly
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Valid year and month (1-12) query params are required.' });
    }

    const days = await getMonthAvailability(req.params.id, year, month - 1);
    res.json({ days });
  } catch (err) {
    res.status(500).json({ error: 'Could not load availability. Please try again.' });
  }
});

module.exports = router;
