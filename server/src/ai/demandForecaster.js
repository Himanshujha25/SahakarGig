const Booking = require('../models/Booking');

async function demandForecastEngine(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const agg = await Booking.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { service: '$service', hour: { $hour: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byService = {};
  for (const row of agg) {
    const svc = row._id.service;
    if (!byService[svc]) byService[svc] = [];
    byService[svc].push({ hour: row._id.hour, count: row.count });
  }

  const topServices = Object.entries(byService)
    .map(([service, hours]) => ({
      service,
      total: hours.reduce((s, h) => s + h.count, 0),
      peakHour: [...hours].sort((a, b) => b.count - a.count)[0]?.hour ?? 0,
      hours,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const hourlyTotals = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));
  for (const row of agg) hourlyTotals[row._id.hour].count += row.count;

  return { topServices, hourlyTotals, days };
}

module.exports = { demandForecastEngine };
