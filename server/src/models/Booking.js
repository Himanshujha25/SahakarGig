const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative' },
    service: { type: String, required: true },
    scheduledTime: { type: Date },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'in-progress', 'completed', 'cancelled', 'disputed'],
      default: 'requested',
    },
    price: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    isEmergency: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    chat: [{ sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, message: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
