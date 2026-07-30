// Single source of truth for whether a coupon code can be used right now,
// and how big a discount it earns. Used from three places, each wanting a
// different failure behavior (see server/routes/cart.js, services/
// cartResolver.js, and routes/payments.js) — this module only ever answers
// the question, callers decide what to do with a rejection.

const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

function fmtRs(n) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

// `base` is subtotal + rentalCharges (before delivery charge / tax) — the
// same figure services/pricing.js already applies discount against, so
// minOrderAmount means the same thing here as it will at pricing time.
async function findValidCoupon(code, { userId, base = 0, cartProductIds = [], cartCategorySlugs = [] } = {}) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { coupon: null, error: 'Enter a coupon code.' };

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) return { coupon: null, error: "That code isn't valid." };

  if (!coupon.isActive) {
    return { coupon: null, error: 'This code is no longer active.' };
  }

  const now = new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { coupon: null, error: "This code isn't active yet." };
  }
  if (coupon.expiryDate && now > coupon.expiryDate) {
    return { coupon: null, error: 'This code has expired.' };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { coupon: null, error: 'This code has reached its usage limit.' };
  }

  if (coupon.minOrderAmount > 0 && base < coupon.minOrderAmount) {
    return { coupon: null, error: `Add ${fmtRs(coupon.minOrderAmount - base)} more to your order to use this code.` };
  }

  if (coupon.firstOrderOnly && userId) {
    const hasOrdered = await Order.exists({ user: userId, status: { $ne: 'cancelled' } });
    if (hasOrdered) {
      return { coupon: null, error: 'This code is for first-time customers only.' };
    }
  }

  if (coupon.singleUsePerCustomer && userId) {
    const alreadyUsed = coupon.usedByUsers.some((id) => String(id) === String(userId));
    if (alreadyUsed) {
      return { coupon: null, error: "You've already used this code." };
    }
  }

  if (coupon.restrictedProducts.length || coupon.restrictedCategories.length) {
    const matchesProduct = cartProductIds.some((id) => coupon.restrictedProducts.includes(id));
    const matchesCategory = cartCategorySlugs.some((slug) => coupon.restrictedCategories.includes(slug));
    if (!matchesProduct && !matchesCategory) {
      return { coupon: null, error: "This code isn't valid for the items in your cart." };
    }
  }

  return { coupon, error: null };
}

// Percentage is capped by maxDiscount (if set); flat never exceeds base.
// Never returns more than `base` either way, matching the old COUPONS
// lookup's `Math.min(coupon.value, base)` guarantee for flat coupons.
function computeDiscount(coupon, base) {
  if (!coupon || !(base > 0)) return 0;
  let discount = coupon.discountType === 'percentage' ? (base * coupon.discountValue) / 100 : coupon.discountValue;
  if (coupon.discountType === 'percentage' && coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return Math.round(Math.min(discount, base));
}

module.exports = { findValidCoupon, computeDiscount };
