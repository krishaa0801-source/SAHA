const mongoose = require('mongoose');

// The confirmed-rental record. Field names deliberately mirror Order's
// (user/productId/from/to) since a Booking is created alongside its
// Order at the same moment — see server/services/booking.js.
//
// Overlap rejection itself is NOT enforced here (a Mongoose schema can't
// express "no other document with an intersecting date range") — it's
// enforced by BookedDate's unique index. This collection is the
// human-readable record; BookedDate is the mechanism.
const bookingSchema = new mongoose.Schema(
  {
    productId: { type: String, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    from: { type: String, required: true }, // rental start date, YYYY-MM-DD
    to: { type: String, required: true }, // rental end date, YYYY-MM-DD (inclusive)
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    paymentStatus: { type: String, enum: ['paid', 'refunded'], default: 'paid' },
    status: { type: String, enum: ['confirmed', 'cancelled', 'completed'], default: 'confirmed' },
  },
  { timestamps: true }
);

bookingSchema.index({ productId: 1, from: 1, to: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
