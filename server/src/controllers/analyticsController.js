const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

// GET /analytics/household — spending insights for a Household user.
async function householdInsights(req, res) {
  const bookings = await Booking.find({ householdId: req.user.userId }).select('_id service price createdAt').lean();
  const bookingIds = bookings.map((b) => b._id);

  const payments = bookingIds.length
    ? await Payment.find({ bookingId: { $in: bookingIds }, status: { $in: ['captured', 'released'] } })
        .select('amount bookingId createdAt method')
        .lean()
    : [];

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const paymentsPaid = payments.filter((p) => p.amount > 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthSpent = paymentsPaid
    .filter((p) => new Date(p.createdAt) >= monthStart)
    .reduce((s, p) => s + p.amount, 0);

  // Breakdown by service (join booking.service via _id map).
  const byId = Object.fromEntries(bookings.map((b) => [String(b._id), b]));
  const byService = {};
  for (const p of paymentsPaid) {
    const svc = byId[String(p.bookingId)]?.service || 'Other';
    byService[svc] = (byService[svc] || 0) + p.amount;
  }
  const categoryBreakdown = Object.entries(byService)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Monthly trend for the last 6 calendar months (oldest → newest).
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rangeStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const rangeEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      key,
      label: d.toLocaleString('en', { month: 'short' }),
      amount: paymentsPaid
        .filter((p) => {
          const t = new Date(p.createdAt);
          return t >= rangeStart && t < rangeEnd;
        })
        .reduce((s, p) => s + p.amount, 0),
    });
  }

  const topService = categoryBreakdown[0] || null;
  const avgPerBooking = paymentCount(paymentsPaid) ? totalPaid / paymentCount(paymentsPaid) : 0;

  res.json({
    totalPaid,
    monthSpent,
    paidBookings: paymentCount(paymentsPaid),
    defaultedPayments: payments.length - paymentsPaid.length,
    categoryBreakdown,
    categoryTotal: categoryBreakdown.reduce((s, c) => s + c.value, 0),
    monthlyTrend: months,
    topService,
    avgPerBooking: Number(avgPerBooking.toFixed(2)),
  });
}

function paymentCount(list) {
  return list.length;
}

module.exports = { householdInsights };