const mongoose = require('mongoose');

// Product name/image are NOT denormalized here — unlike Order (which
// snapshots historical facts about what was actually purchased), a review
// is always about the CURRENT product, so the admin/public routes look
// name/image up live from Product (same `_id` string Product itself uses,
// like Cart/Order already reference it).
const reviewSchema = new mongoose.Schema(
  {
    product: { type: String, ref: 'Product', required: true },
    customerName: { type: String, required: true, trim: true },
    customerImage: { type: String, default: '' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    // Admin-editable and separate from createdAt so a review can be
    // backdated (e.g. entering reviews collected before this system
    // existed) without misrepresenting when the record itself was added.
    reviewDate: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Product detail page: published reviews for one product, featured first.
reviewSchema.index({ product: 1, published: 1 });
reviewSchema.index({ featured: -1, reviewDate: -1 });

module.exports = mongoose.model('Review', reviewSchema);
