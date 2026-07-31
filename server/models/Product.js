const mongoose = require('mongoose');

const SIZE_ENUM = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// One row per size the product is offered in. `quantity` is display-only
// (shown in the admin UI and product sidebar) — it does NOT feed the
// booking engine. Availability is still governed entirely by
// server/services/booking.js + BookedDate, which blocks a date range for
// a size the moment ANY confirmed booking exists for it, same as before
// this schema changed — that decision was made deliberately so the
// race-safe booking guarantees never had to change.
const sizeSchema = new mongoose.Schema(
  {
    size: { type: String, enum: SIZE_ENUM, required: true },
    quantity: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const galleryImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbnailUrl: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

// Denormalized from Review (see routes/admin/reviews.js's
// recomputeProductRating) rather than aggregated live on every read —
// the public product LIST endpoint returns up to 500 products per
// request, so a live $avg over Reviews for each one isn't worth it.
const ratingSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

// The catalog's authoritative source of truth. _id is a generated hex
// string (see server/routes/admin/products.js) rather than a Mongo
// ObjectId — every existing `productId: String` reference in Cart, Order,
// Booking, and BookedDate already expects a plain string, so nothing
// downstream needed to change when this model moved from the old
// hardcoded-generator schema to a real admin-managed one.
const productSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true }, // Category.slug
    brand: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    // Base Rental Price — a flat one-time fee, not a daily rate. The
    // actual charge for a given rental is this × a tier multiplier from
    // services/pricing.js (1x for 1-2 days, 1.3x for 3-7, 1.5x for 8+),
    // never × number of days.
    price: { type: Number, required: true, min: 0 },
    sizes: { type: [sizeSchema], default: [] },
    image: { type: String, required: true }, // hanger PNG URL (public/uploads/products/hangers/...)
    galleryImages: { type: [galleryImageSchema], default: [] },
    status: { type: String, enum: ['available', 'rented', 'hidden'], default: 'available' },
    rating: { type: ratingSchema, default: () => ({ average: 0, count: 0 }) },
  },
  { timestamps: true }
);

// Covers the public list's category filter and the admin dashboard's
// status-filtered "recently added" query (server/routes/admin/dashboard.js,
// server/routes/products.js).
productSchema.index({ category: 1 });
productSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
module.exports.SIZE_ENUM = SIZE_ENUM;
