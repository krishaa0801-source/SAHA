const mongoose = require('mongoose');

// One profile per user. Uniqueness is enforced by findOneAndUpdate's
// upsert in routes/fitMatch.js (keyed on userId from the session, never
// from the request body) rather than relying on the schema-level unique
// index alone to prevent duplicates under a race — the index is still
// here as a hard backstop at the DB layer.
const fitMatchProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    height: { type: Number, required: true, min: 100, max: 250 }, // cm
    bust: { type: Number, required: true, min: 20, max: 60 }, // inches
    waist: { type: Number, required: true, min: 20, max: 60 }, // inches
    hip: { type: Number, required: true, min: 20, max: 70 }, // inches
    shoulderWidth: { type: Number, required: true, min: 10, max: 25 }, // inches
    recommendedSize: { type: String, required: true, enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  },
  { timestamps: true } // updatedAt doubles as "timestamp of last calculation"
);

module.exports = mongoose.model('FitMatchProfile', fitMatchProfileSchema);
