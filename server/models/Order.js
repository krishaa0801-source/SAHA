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
    total: { type: Number, required: true },
    status: { type: String, enum: ['confirmed', 'completed', 'cancelled'], default: 'confirmed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
