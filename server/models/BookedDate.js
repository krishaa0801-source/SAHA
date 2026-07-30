const mongoose = require('mongoose');

// The actual race-condition guard. MongoDB has no built-in way to reject
// a new document whose date RANGE overlaps an existing document's range
// — a unique index can only reject an exact duplicate key. So instead of
// storing one row per booking and hoping a transaction catches the
// overlap (it won't — two transactions inserting two different Booking
// documents never touch the same document, so MongoDB's write-conflict
// detection never fires, even if their date ranges overlap), every
// booked date is decomposed into one row per calendar day.
//
// The unique index below turns "is Aug 12 already booked for party-1"
// into an exact-key lookup, which MongoDB *does* enforce atomically
// under concurrency — the storage engine itself guarantees that of two
// simultaneous inserts for the same (productId, date), exactly one
// succeeds and the other gets a duplicate-key error. That guarantee is
// what makes reserveBooking() in server/services/booking.js safe against
// two customers booking the same day at the same instant.
const bookedDateSchema = new mongoose.Schema({
  productId: { type: String, ref: 'Product', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD, one document per occupied calendar day
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
});

bookedDateSchema.index({ productId: 1, date: 1 }, { unique: true });
// The admin dashboard's "currently rented" stat (BookedDate.distinct
// ('productId', { date: today })) filters on `date` alone, which the
// compound index above can't serve efficiently since date isn't its
// prefix key — this standalone index is what that query actually uses.
bookedDateSchema.index({ date: 1 });

module.exports = mongoose.model('BookedDate', bookedDateSchema);
