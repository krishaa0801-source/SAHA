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
    price: { type: Number, required: true, min: 0 }, // rental price per day
    sizes: { type: [sizeSchema], default: [] },
    image: { type: String, required: true }, // hanger PNG URL (public/uploads/products/hangers/...)
    galleryImages: { type: [galleryImageSchema], default: [] },
    status: { type: String, enum: ['available', 'rented', 'hidden'], default: 'available' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
module.exports.SIZE_ENUM = SIZE_ENUM;
