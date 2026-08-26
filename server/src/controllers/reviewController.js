const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { computeTrustScore } = require('../utils/helpers');

async function createReview(req, res) {
  const { bookingId, rating, comment } = req.body;
  if (!bookingId || !rating) return res.status(400).json({ message: 'bookingId and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });

  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'completed') return res.status(400).json({ message: 'Can only review completed bookings' });
  if (b.householdId.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household that booked can review' });

  try {
    const r = await Review.create({ bookingId, rating, comment, createdBy: req.user.userId });
    await computeTrustScore(b.providerId);
    res.status(201).json(r);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You have already reviewed this booking' });
    throw err;
  }
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
