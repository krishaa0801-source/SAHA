const Booking = require('../models/Booking');
const BookedDate = require('../models/BookedDate');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Every calendar day from `from` to `to`, inclusive of both ends — this
// matches how the rest of the app counts rental days (see
// services/pricing.js diffDays): a 10-15 Aug booking occupies
// 10,11,12,13,14,15, so a booking starting 16 Aug does not overlap it.
function datesBetween(from, to) {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) return [];
  const out = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (end < cursor) return [];
  while (cursor <= end) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

// Best-effort, non-transactional overlap check for immediate UX feedback
// (adding to cart, starting checkout) — classic interval-overlap test:
// two ranges [from,to] and [existing.from,existing.to] intersect iff
// from <= existing.to AND existing.from <= to. String comparison works
// because dates are zero-padded ISO (YYYY-MM-DD sorts lexicographically
// the same as chronologically).
//
// This is NOT what prevents the double-booking race — see
// reserveBooking below for that. This is only a fast, friendly "no" for
// the common, non-simultaneous case, so most conflicts are caught long
// before anyone pays.
async function hasOverlap(productId, from, to) {
  const conflict = await Booking.findOne({
    productId,
    status: 'confirmed',
    from: { $lte: to },
    to: { $gte: from },
  }).lean();
  return Boolean(conflict);
}

// The authoritative, race-safe reservation. Must run inside a Mongoose
// session that the caller already started a transaction on. Expands the
// range into one BookedDate per day and inserts them all; if ANY day is
// already taken, the unique index on BookedDate throws a duplicate-key
// error here, which propagates up and aborts the whole transaction —
// the Booking document (and anything else in the same transaction, e.g.
// the Order) is rolled back with it. See models/BookedDate.js for why
// this is what actually makes concurrent bookings safe, not the
// transaction by itself.
async function reserveBooking({ session, productId, userId, from, to, orderId }) {
  const dates = datesBetween(from, to);
  if (!dates.length) {
    throw new Error('Invalid rental date range.');
  }

  const [booking] = await Booking.create(
    [{ productId, user: userId, from, to, orderId, paymentStatus: 'paid', status: 'confirmed' }],
    { session }
  );

  try {
    await BookedDate.insertMany(
      dates.map((date) => ({ productId, date, booking: booking._id })),
      { session, ordered: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      const conflictErr = new Error(`${productId} is no longer available for the selected dates.`);
      conflictErr.isBookingConflict = true;
      throw conflictErr;
    }
    throw err;
  }

  return booking;
}

// Every day in the given month with its status — powers the frontend
// calendar (GET /api/products/:id/availability). `month` is 0-indexed
// (JS Date convention), matching the caller in routes/products.js.
async function getMonthAvailability(productId, year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  const from = first.toISOString().slice(0, 10);
  const to = last.toISOString().slice(0, 10);

  const booked = await BookedDate.find({ productId, date: { $gte: from, $lte: to } })
    .select('date -_id')
    .lean();
  const bookedSet = new Set(booked.map((b) => b.date));

  const nDays = last.getUTCDate();
  const days = [];
  for (let d = 1; d <= nDays; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({ date, status: bookedSet.has(date) ? 'booked' : 'available' });
  }
  return days;
}

module.exports = { datesBetween, hasOverlap, reserveBooking, getMonthAvailability };
