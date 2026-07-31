const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: String, default: '' },
    name: { type: String, required: true },
    category: { type: String, default: '' },
    size: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    days: { type: Number, required: true },
    // Snapshotted at order time from services/pricing.js's
    // calculateRentalPrice(), so a later change to the product's base
    // price (or, in theory, the tier rules) never rewrites history —
    // this order stays priced exactly as it was charged.
    basePrice: { type: Number, required: true },
    tierMultiplier: { type: Number, required: true },
    tierLabel: { type: String, required: true },
    // rentalTotal is the rental-only charge (basePrice × tierMultiplier ×
    // qty) — what `total` used to mean before security deposits existed.
    // `total` now means what it always displayed as everywhere in the UI
    // ("Total Paid"): rentalTotal + securityDeposit, this line's full
    // share of the actual Razorpay charge.
    rentalTotal: { type: Number, required: true },
    securityDeposit: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ['confirmed', 'completed', 'cancelled'], default: 'confirmed' },
    // Deposit lifecycle — only meaningful once status is 'completed' (see
    // server/routes/admin/orders.js, the only place these change after
    // creation). depositNote is an internal admin reason (e.g. "Minor
    // stain") and must never be sent to a customer-facing endpoint — see
    // routes/orders.js's .select('-depositNote').
    depositStatus: { type: String, enum: ['pending', 'refunded', 'forfeited', 'partially_refunded'], default: 'pending' },
    depositRefundAmount: { type: Number, default: 0 },
    depositNote: { type: String, default: '' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
  },
  { timestamps: true }
);

// The admin dashboard's "recent orders" query sorts by createdAt across
// ALL users (server/routes/admin/dashboard.js), so the per-user index
// above doesn't help it — this does.
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
