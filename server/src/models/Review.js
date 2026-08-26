const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One review per booking per user — prevents trust score spam
reviewSchema.index({ bookingId: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
