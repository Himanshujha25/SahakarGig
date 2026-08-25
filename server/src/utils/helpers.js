const jwt = require('jsonwebtoken');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');

function signToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

// Distance in km between two {lat,lng} points
function haversine(a, b) {
  if (!a || !b || a.lat == null || b.lat == null) return Infinity;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Trust Score = (avgRating/5 * 0.5) + (completionRate * 0.3) + (verified * 0.2)
async function computeTrustScore(providerId) {
  const provider = await Provider.findById(providerId);
  const bookings = await Booking.find({ providerId });
  const reviews = await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } });
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const completed = bookings.filter((b) => b.status === 'completed').length;
  const completionRate = bookings.length ? completed / bookings.length : 0;
  const verified = provider && provider.verified ? 1 : 0;
  return Number(((avgRating / 5) * 0.5 + completionRate * 0.3 + verified * 0.2).toFixed(2));
}

function invoiceNumber() {
  return 'SG-' + new Date().getFullYear() + '-' + Date.now().toString().slice(-6);
}

module.exports = { signToken, haversine, computeTrustScore, invoiceNumber };
