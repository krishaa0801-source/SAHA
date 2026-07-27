const mongoose = require('mongoose');

// Intentionally does NOT store name/brand/image/price/sizes.
// Those are display/pricing data that only ever come from Product — a
// cart item is just a pointer (productId + size + qty + dates) so there
// is nothing client-supplied left in here to trust or go stale.
const cartItemSchema = new mongoose.Schema({
  productId: { type: String, ref: 'Product', required: true },
  size: { type: String, required: true },
  qty: { type: Number, default: 1, min: 1, max: 5 },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
});

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    coupon: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
