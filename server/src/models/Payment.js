const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    amount: { type: Number, default: 0 },
    cooperativeCommission: { type: Number, default: 0 },
    federationCommission: { type: Number, default: 0 },
    providerPayout: { type: Number, default: 0 },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    status: { type: String, enum: ['pending', 'captured', 'released', 'refunded'], default: 'pending' },
    method: { type: String, default: 'razorpay' },
    refundedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
