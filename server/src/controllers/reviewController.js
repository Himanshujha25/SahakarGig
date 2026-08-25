const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');

async function createReview(req, res) {
  const { bookingId, rating, comment } = req.body;
  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'completed') return res.status(400).json({ message: 'Can only review completed bookings' });
  const r = await Review.create({ bookingId, rating, comment, createdBy: req.user.userId });
  res.status(201).json(r);
}

async function providerReviews(req, res) {
  const { providerId } = req.params;
  const bookings = await Booking.find({ providerId });
  const reviews = await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } })
    .populate('createdBy', 'name')
    .sort('-createdAt');
  res.json(reviews);
}

module.exports = { createReview, providerReviews };
