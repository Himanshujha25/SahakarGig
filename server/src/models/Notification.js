const mongoose = require('mongoose');

const notifSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String },
    message: { type: String },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notifSchema);
