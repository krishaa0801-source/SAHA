const express = require('express');
const { body } = require('express-validator');
const Review = require('../../models/Review');
const Product = require('../../models/Product');
const { reviewImageUpload } = require('../../middleware/upload');
const { processReviewerImage, removePublicFile } = require('../../services/imageProcessor');
const handleValidationErrors = require('../../middleware/validate');
const logger = require('../../utils/logger');

const router = express.Router();

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Recomputes and stores the product's denormalized rating summary —
// called after every mutation that could change what "published reviews
// for this product" looks like. Denormalized (rather than aggregated live
// on every product read) because the public product LIST endpoint returns
// up to 500 products per request.
async function recomputeProductRating(productId) {
  const [agg] = await Review.aggregate([
    { $match: { product: productId, published: true } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    { rating: agg ? { average: Math.round(agg.average * 10) / 10, count: agg.count } : { average: 0, count: 0 } }
  );
}

async function productMapFor(reviews) {
  const ids = [...new Set(reviews.map((r) => r.product))];
  const products = await Product.find({ _id: { $in: ids } }).select('name image').lean();
  return new Map(products.map((p) => [p._id, p]));
}

function toAdminReview(review, productMap) {
  const product = productMap.get(review.product);
  return {
    id: review._id,
    product: review.product,
    productName: product?.name || '(deleted product)',
    productImage: product?.image || '',
    customerName: review.customerName,
    customerImage: review.customerImage,
    rating: review.rating,
    title: review.title,
    text: review.text,
    reviewDate: review.reviewDate,
    verified: review.verified,
    featured: review.featured,
    published: review.published,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

const reviewValidators = [
  body('product').isString().trim().notEmpty().withMessage('Choose a product.'),
  body('customerName').isString().trim().notEmpty().withMessage('Customer name is required.').isLength({ max: 80 }),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('title').isString().trim().notEmpty().withMessage('Review title is required.').isLength({ max: 120 }),
  body('text').isString().trim().notEmpty().withMessage('Review text is required.').isLength({ max: 2000 }),
  body('reviewDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid review date.'),
  body('verified').optional().isBoolean().withMessage('Invalid verified value.'),
  body('featured').optional().isBoolean().withMessage('Invalid featured value.'),
  body('published').optional().isBoolean().withMessage('Invalid published value.'),
];

// Multipart bodies stringify every field, so booleans arrive as 'true'/
// 'false' strings — express-validator's isBoolean accepts that, but we
// still need to coerce before writing to Mongoose.
function toBool(v, fallback) {
  if (v === undefined) return fallback;
  return v === true || v === 'true';
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.product) filter.product = req.query.product;
    if (req.query.rating) filter.rating = Number(req.query.rating);
    if (req.query.published === 'published') filter.published = true;
    if (req.query.published === 'hidden') filter.published = false;
    if (req.query.dateFrom || req.query.dateTo) {
      filter.reviewDate = {};
      if (req.query.dateFrom) filter.reviewDate.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) filter.reviewDate.$lte = new Date(req.query.dateTo);
    }
    if (req.query.q) {
      const re = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
      const matchingProductIds = await Product.find({ name: re }).distinct('_id');
      filter.$or = [{ customerName: re }, { product: { $in: matchingProductIds } }];
    }

    let sort = { featured: -1, reviewDate: -1 };
    if (req.query.sort === 'oldest') sort = { featured: -1, reviewDate: 1 };
    else if (req.query.sort === 'rating_desc') sort = { featured: -1, rating: -1, reviewDate: -1 };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Review.countDocuments(filter),
    ]);
    const productMap = await productMapFor(reviews);

    res.json({ reviews: reviews.map((r) => toAdminReview(r, productMap)), total, page, limit });
  } catch (err) {
    logger.error('List reviews error:', err);
    res.status(500).json({ error: 'Could not load reviews. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).lean();
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    const productMap = await productMapFor([review]);
    res.json({ review: toAdminReview(review, productMap) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load this review. Please try again.' });
  }
});

router.post('/', reviewImageUpload, reviewValidators, handleValidationErrors, async (req, res) => {
  try {
    const product = await Product.findById(req.body.product).select('_id').lean();
    if (!product) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: { product: 'Choose a valid product.' } });
    }

    const review = await Review.create({
      product: req.body.product,
      customerName: req.body.customerName.trim(),
      rating: Number(req.body.rating),
      title: req.body.title.trim(),
      text: req.body.text.trim(),
      reviewDate: req.body.reviewDate ? new Date(req.body.reviewDate) : new Date(),
      verified: toBool(req.body.verified, false),
      featured: toBool(req.body.featured, false),
      published: toBool(req.body.published, true),
    });

    const imageFile = req.files?.customerImage?.[0];
    if (imageFile) {
      review.customerImage = await processReviewerImage(imageFile.buffer, imageFile.mimetype, review._id);
      await review.save();
    }

    await recomputeProductRating(review.product);

    const productMap = await productMapFor([review]);
    res.status(201).json({ review: toAdminReview(review.toObject(), productMap) });
  } catch (err) {
    logger.error('Create review error:', err);
    res.status(500).json({ error: 'Could not create the review. Please try again.' });
  }
});

router.put('/:id', reviewImageUpload, reviewValidators, handleValidationErrors, async (req, res) => {
  try {
    const existing = await Review.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Review not found.' });

    const product = await Product.findById(req.body.product).select('_id').lean();
    if (!product) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: { product: 'Choose a valid product.' } });
    }

    const previousProduct = existing.product;

    existing.product = req.body.product;
    existing.customerName = req.body.customerName.trim();
    existing.rating = Number(req.body.rating);
    existing.title = req.body.title.trim();
    existing.text = req.body.text.trim();
    existing.reviewDate = req.body.reviewDate ? new Date(req.body.reviewDate) : existing.reviewDate;
    existing.verified = toBool(req.body.verified, existing.verified);
    existing.featured = toBool(req.body.featured, existing.featured);
    existing.published = toBool(req.body.published, existing.published);

    const imageFile = req.files?.customerImage?.[0];
    if (imageFile) {
      existing.customerImage = await processReviewerImage(imageFile.buffer, imageFile.mimetype, existing._id);
    }

    await existing.save();

    await recomputeProductRating(existing.product);
    if (previousProduct !== existing.product) {
      await recomputeProductRating(previousProduct);
    }

    const productMap = await productMapFor([existing]);
    res.json({ review: toAdminReview(existing.toObject(), productMap) });
  } catch (err) {
    logger.error('Update review error:', err);
    res.status(500).json({ error: 'Could not update the review. Please try again.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    await review.deleteOne();
    if (review.customerImage) await removePublicFile(review.customerImage);
    await recomputeProductRating(review.product);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete the review. Please try again.' });
  }
});

async function setField(req, res, field, value) {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { [field]: value }, { new: true });
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    if (field === 'published') await recomputeProductRating(review.product);
    const productMap = await productMapFor([review]);
    res.json({ review: toAdminReview(review.toObject(), productMap) });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the review. Please try again.' });
  }
}

router.post('/:id/publish', (req, res) => setField(req, res, 'published', true));
router.post('/:id/hide', (req, res) => setField(req, res, 'published', false));
router.post('/:id/feature', (req, res) => setField(req, res, 'featured', true));
router.post('/:id/unfeature', (req, res) => setField(req, res, 'featured', false));
router.post('/:id/verify', (req, res) => setField(req, res, 'verified', true));
router.post('/:id/unverify', (req, res) => setField(req, res, 'verified', false));

module.exports = router;
