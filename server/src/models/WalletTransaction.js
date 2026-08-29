const mongoose = require('mongoose');

const walletTxnSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    method: { type: String, default: 'razorpay' }, // razorpay | booking-payment
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTxnSchema);