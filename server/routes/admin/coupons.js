const express = require('express');
const { body } = require('express-validator');
const Coupon = require('../../models/Coupon');
const handleValidationErrors = require('../../middleware/validate');
const logger = require('../../utils/logger');

const router = express.Router();

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function computeStatus(coupon) {
  const now = new Date();
  if (!coupon.isActive) return 'disabled';
  if (coupon.expiryDate && now > new Date(coupon.expiryDate)) return 'expired';
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'exhausted';
  if (coupon.startDate && now < new Date(coupon.startDate)) return 'scheduled';
  return 'active';
}

function toAdminCoupon(coupon) {
  return {
    id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    startDate: coupon.startDate,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
    firstOrderOnly: coupon.firstOrderOnly,
    singleUsePerCustomer: coupon.singleUsePerCustomer,
    restrictedProducts: coupon.restrictedProducts,
    restrictedCategories: coupon.restrictedCategories,
    status: computeStatus(coupon),
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

const couponValidators = [
  body('code')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required.')
    .isLength({ max: 30 })
    .withMessage('Coupon code is too long.')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Use only letters, numbers, hyphens, and underscores.'),
  body('discountType').isIn(['percentage', 'flat']).withMessage('Choose a discount type.'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be 0 or greater.'),
  body('minOrderAmount').optional().isFloat({ min: 0 }).withMessage('Minimum order amount must be 0 or greater.'),
  body('maxDiscount').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Maximum discount must be 0 or greater.'),
  body('usageLimit').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Usage limit must be at least 1.'),
  body('startDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid start date.'),
  body('expiryDate').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Invalid expiry date.'),
  body('isActive').optional().isBoolean().withMessage('Invalid active value.'),
  body('firstOrderOnly').optional().isBoolean().withMessage('Invalid value.'),
  body('singleUsePerCustomer').optional().isBoolean().withMessage('Invalid value.'),
  body('restrictedProducts').optional().isArray().withMessage('Invalid restricted products.'),
  body('restrictedCategories').optional().isArray().withMessage('Invalid restricted categories.'),
];

// Cross-field checks express-validator chains can't express cleanly on
// their own (percentage cap, date ordering) — same manual-check style as
// routes/admin/categories.js's duplicate-name check.
function crossFieldErrors(body) {
  const errors = {};
  if (body.discountType === 'percentage' && Number(body.discountValue) > 100) {
    errors.discountValue = 'A percentage discount cannot exceed 100.';
  }
  if (body.startDate && body.expiryDate && new Date(body.expiryDate) <= new Date(body.startDate)) {
    errors.expiryDate = 'Expiry date must be after the start date.';
  }
  return errors;
}

function toCouponFields(body) {
  return {
    code: String(body.code).trim().toUpperCase(),
    discountType: body.discountType,
    discountValue: Number(body.discountValue),
    minOrderAmount: body.minOrderAmount !== undefined ? Number(body.minOrderAmount) || 0 : 0,
    maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
    usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
    firstOrderOnly: Boolean(body.firstOrderOnly),
    singleUsePerCustomer: Boolean(body.singleUsePerCustomer),
    restrictedProducts: Array.isArray(body.restrictedProducts) ? body.restrictedProducts.filter((v) => typeof v === 'string') : [],
    restrictedCategories: Array.isArray(body.restrictedCategories) ? body.restrictedCategories.filter((v) => typeof v === 'string') : [],
  };
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.discountType) filter.discountType = req.query.discountType;
    if (req.query.q) {
      filter.code = new RegExp(escapeRegex(String(req.query.q).trim().toUpperCase()), 'i');
    }

    let sort = { createdAt: -1 };
    if (req.query.sort === 'oldest') sort = { createdAt: 1 };
    else if (req.query.sort === 'expiry') sort = { expiryDate: 1 };

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Coupon.countDocuments(filter),
    ]);

    let shaped = coupons.map(toAdminCoupon);
    // `status` is computed, not stored, so filtering by it happens after
    // the DB fetch — the page sizes used here (admin coupon lists) are
    // small enough that this doesn't need to be pushed into the query.
    if (req.query.status) {
      shaped = shaped.filter((c) => c.status === req.query.status);
    }

    res.json({ coupons: shaped, total, page, limit });
  } catch (err) {
    logger.error('List coupons error:', err);
    res.status(500).json({ error: 'Could not load coupons. Please try again.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id).lean();
    if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ coupon: toAdminCoupon(coupon) });
  } catch (err) {
    res.status(500).json({ error: 'Could not load this coupon. Please try again.' });
  }
});

router.post('/', couponValidators, handleValidationErrors, async (req, res) => {
  try {
    const crossErrors = crossFieldErrors(req.body);
    if (Object.keys(crossErrors).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: crossErrors });
    }

    const fields = toCouponFields(req.body);
    const existing = await Coupon.findOne({ code: fields.code });
    if (existing) {
      return res.status(409).json({ error: 'A coupon with that code already exists.', fields: { code: 'This code is already in use.' } });
    }

    const coupon = await Coupon.create(fields);
    res.status(201).json({ coupon: toAdminCoupon(coupon) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A coupon with that code already exists.', fields: { code: 'This code is already in use.' } });
    }
    logger.error('Create coupon error:', err);
    res.status(500).json({ error: 'Could not create the coupon. Please try again.' });
  }
});

router.put('/:id', couponValidators, handleValidationErrors, async (req, res) => {
  try {
    const crossErrors = crossFieldErrors(req.body);
    if (Object.keys(crossErrors).length) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: crossErrors });
    }

    const fields = toCouponFields(req.body);
    const existing = await Coupon.findOne({ code: fields.code, _id: { $ne: req.params.id } });
    if (existing) {
      return res.status(409).json({ error: 'A coupon with that code already exists.', fields: { code: 'This code is already in use.' } });
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ coupon: toAdminCoupon(coupon) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A coupon with that code already exists.', fields: { code: 'This code is already in use.' } });
    }
    logger.error('Update coupon error:', err);
    res.status(500).json({ error: 'Could not update the coupon. Please try again.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
    await coupon.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete the coupon. Please try again.' });
  }
});

router.post('/:id/toggle', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: 'Coupon not found.' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ coupon: toAdminCoupon(coupon) });
  } catch (err) {
    res.status(500).json({ error: 'Could not update the coupon. Please try again.' });
  }
});

// Always starts disabled with a fresh, unused code — same "a duplicate
// never silently goes live untouched" convention as Product duplication.
router.post('/:id/duplicate', async (req, res) => {
  try {
    const source = await Coupon.findById(req.params.id).lean();
    if (!source) return res.status(404).json({ error: 'Coupon not found.' });

    let suffix = 1;
    let code = `${source.code}-COPY`;
    // eslint-disable-next-line no-await-in-loop
    while (await Coupon.findOne({ code })) {
      suffix += 1;
      code = `${source.code}-COPY${suffix}`;
    }

    const coupon = await Coupon.create({
      code,
      discountType: source.discountType,
      discountValue: source.discountValue,
      minOrderAmount: source.minOrderAmount,
      maxDiscount: source.maxDiscount,
      usageLimit: source.usageLimit,
      startDate: source.startDate,
      expiryDate: source.expiryDate,
      isActive: false,
      firstOrderOnly: source.firstOrderOnly,
      singleUsePerCustomer: source.singleUsePerCustomer,
      restrictedProducts: source.restrictedProducts,
      restrictedCategories: source.restrictedCategories,
    });

    res.status(201).json({ coupon: toAdminCoupon(coupon) });
  } catch (err) {
    logger.error('Duplicate coupon error:', err);
    res.status(500).json({ error: 'Could not duplicate the coupon. Please try again.' });
  }
});

module.exports = router;
