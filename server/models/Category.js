const mongoose = require('mongoose');

// The join key Product.category stores is Category.slug (a plain string,
// same pattern the app already used for the old party/wedding/vacation
// collections) — no populate() needed anywhere that reads a product.
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
