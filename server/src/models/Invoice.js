const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' },
    items: [{ description: String, qty: Number, rate: Number, amount: Number }],
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    customNotes: { type: String, default: '' },
    sacCode: { type: String, default: '998719' },
    terms: { type: String, default: 'Payment held in Sahakar Escrow. Released upon OTP verification.' },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
