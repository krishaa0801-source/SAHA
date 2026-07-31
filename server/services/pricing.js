// Single source of truth for every rupee this app charges. Nothing here
// ever accepts a price or total from the client — every number is
// derived from a Product document fetched from MongoDB plus the dates/
// qty/coupon the client asked for.
//
// TAX_RATE is a placeholder until the business defines real policy — it's
// conservative (0% never overcharges a customer) and is a one-line change
// once you have a real number. The old frontend math never charged tax
// either, so this doesn't change what anyone pays today.
//
// There is no security deposit anywhere in this module — it was removed
// (calculation, storage, and display) at the business's request.

const DELIVERY_CHARGE = 99; // flat per order when the cart isn't empty — was called "platform fee" client-side before this redesign; same amount, clearer name.
const TAX_RATE = 0; // e.g. 0.05 for 5% GST — ask the business before enabling.

// Fixed-tier rental pricing. This replaced the old "price per day ×
// number of days" model — a rental is now a ONE-TIME flat fee for the
// whole date range, chosen by which bucket the day count falls in. Order
// matters: the first tier whose range contains `days` wins.
const RENTAL_PRICING_TIERS = [
  { min: 1, max: 2, multiplier: 1, label: '1–2 Days' },
  { min: 3, max: 7, multiplier: 1.3, label: '3–7 Days' },
  { min: 8, max: Infinity, multiplier: 1.5, label: '8+ Days' },
];

function getPricingTier(days) {
  return RENTAL_PRICING_TIERS.find((t) => days >= t.min && days <= t.max) || RENTAL_PRICING_TIERS[RENTAL_PRICING_TIERS.length - 1];
}

// THE one place the app turns a product's base price + a day count into
// money. Every rental total anywhere — cart, checkout, Razorpay amount,
// Order records, admin displays — must go through this (directly or via
// priceLine below) so they can never disagree.
function calculateRentalPrice(basePrice, days) {
  const tier = getPricingTier(days);
  return { basePrice, days, tierLabel: tier.label, tierMultiplier: tier.multiplier, total: basePrice * tier.multiplier };
}

const { computeDiscount } = require('./couponService');
const { getDetailImage } = require('../utils/productImage');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Returns the inclusive day count for a rental, or null if the range is
// missing, malformed, or backwards — callers must treat null as a reject.
function diffDays(from, to) {
  if (typeof from !== 'string' || typeof to !== 'string') return null;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return null;
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

// Validates one cart line against its authoritative Product document.
// Returns a priced line, or { error } if the request can't be honored —
// callers decide whether that's a 400 (new item) or a silent drop
// (existing cart item whose product/size became unavailable).
function priceLine({ product, size, qty, from, to }) {
  if (!product || product.status === 'hidden') {
    return { error: 'That item is no longer available.' };
  }
  const safeQty = Math.max(1, Math.min(5, Number(qty) || 1));
  // product.sizes is [{size, quantity}]. quantity does NOT make booking
  // multi-unit-aware (see models/Product.js) — the date-range exclusivity
  // in services/booking.js is unchanged — but a size with quantity 0 is
  // simply not offered at all, so it's excluded here too (this is what
  // makes an unavailable size actually disabled, not just visually
  // greyed out on the frontend). `sizeNames` — what's sent back to the
  // client — stays a plain string[] of the sizes that ARE offered (see
  // client/src/lib/cart.ts CartItem.sizes).
  const sizeNames = product.sizes.filter((s) => s.quantity > 0).map((s) => s.size);
  if (!size || !sizeNames.includes(size)) {
    return { error: `Size "${size}" isn't available for ${product.name}.` };
  }
  const days = diffDays(from, to);
  if (days === null) {
    return { error: 'Choose a valid rental start and end date.' };
  }

  const unitPricing = calculateRentalPrice(product.price, days);
  // lineSubtotal/lineRentalCharge keep their old names (calculateTotals
  // and every consumer of it — CartSummary's "Subtotal"/"Rental Charges"
  // rows — sum these two independently) but now mean something new:
  // lineSubtotal is the base price × qty, and lineRentalCharge is the
  // tier premium on top of it (0 for the 1x tier). The two still always
  // add up to lineTotal.
  const lineSubtotal = unitPricing.basePrice * safeQty;
  const lineRentalCharge = (unitPricing.total - unitPricing.basePrice) * safeQty;

  return {
    productId: product._id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image: getDetailImage(product), // detail/gallery photo, never the hanger listing image (see GarmentPhoto.jsx)
    sizes: sizeNames,
    size,
    qty: safeQty,
    from,
    to,
    days,
    unitPrice: product.price,
    basePrice: unitPricing.basePrice,
    tierLabel: unitPricing.tierLabel,
    tierMultiplier: unitPricing.tierMultiplier,
    lineSubtotal,
    lineRentalCharge,
    lineTotal: lineSubtotal + lineRentalCharge,
  };
}

// Aggregates already-priced lines (from priceLine) into the order summary.
// `total` is the exact amount charged via Razorpay. `coupon` must already
// be a *validated* Coupon document (or null) — see services/couponService.js
// findValidCoupon(); this function never looks anything up itself, it only
// applies a discount it's handed.
function calculateTotals(lines, coupon) {
  let subtotal = 0;
  let rentalCharges = 0;
  lines.forEach((l) => {
    subtotal += l.lineSubtotal;
    rentalCharges += l.lineRentalCharge;
  });

  const deliveryCharge = lines.length ? DELIVERY_CHARGE : 0;
  const base = subtotal + rentalCharges;
  const discount = computeDiscount(coupon, base);

  const taxableBase = Math.max(base + deliveryCharge - discount, 0);
  const tax = Math.round(taxableBase * TAX_RATE);
  const total = taxableBase + tax;

  return { subtotal, rentalCharges, deliveryCharge, discount, tax, total };
}

module.exports = {
  DELIVERY_CHARGE,
  TAX_RATE,
  RENTAL_PRICING_TIERS,
  getPricingTier,
  calculateRentalPrice,
  diffDays,
  priceLine,
  calculateTotals,
};
