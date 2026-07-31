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
    total: { type: Number, required: true },
    status: { type: String, enum: ['confirmed', 'completed', 'cancelled'], default: 'confirmed' },
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
