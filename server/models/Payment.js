const mongoose = require('mongoose');

// One document per checkout attempt (per Razorpay order we create). This
// is what makes verify-payment safe against replay: a payment can only
// move created -> paid ONCE (see the atomic findOneAndUpdate in
// server/routes/payments.js), so a previously-used
// order_id/payment_id/signature triple can never be resubmitted to mint
// a second, unpaid order — even a genuinely-valid old signature fails
// the claim once its Payment is no longer in the 'created' state.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, default: '' },
    razorpaySignature: { type: String, default: '' },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created', index: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
