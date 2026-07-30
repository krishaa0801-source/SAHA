const mongoose = require('mongoose');

// Replaces the old hardcoded COUPONS object in services/pricing.js — the
// admin panel is now the only way coupons come into existence. "Active/
// Expired" shown in the admin table is a COMPUTED status (see
// routes/admin/coupons.js's toAdminCoupon), not stored here, since it's
// inherently time/usage-dependent — isActive below is only the manual
// enable/disable flag, one of several inputs into that computed status.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 30 },
    discountType: { type: String, enum: ['percentage', 'flat'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    // Only meaningful when discountType === 'percentage'; null = uncapped.
    maxDiscount: { type: Number, default: null, min: 0 },
    // null = unlimited total redemptions.
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    firstOrderOnly: { type: Boolean, default: false },
    singleUsePerCustomer: { type: Boolean, default: false },
    // Tracks redemptions for singleUsePerCustomer — populated atomically
    // alongside usedCount at checkout finalization (see payments.js).
    usedByUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Empty arrays = no restriction. Values are Product._id (string) and
    // Category.slug, matching how Product itself references a category.
    restrictedProducts: { type: [String], default: [] },
    restrictedCategories: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);
