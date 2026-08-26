const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const { emitTo } = require('../socket');

async function demandForecast(req, res) {
  const days = parseInt(req.query.range) || 7;
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

  res.json({ topServices, hourlyTotals, days });
}

async function nudgeProviders(req, res) {
  const { cooperativeId } = req.body;
  const since = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const recentBookings = await Booking.find({ createdAt: { $gte: since } });
  if (recentBookings.length === 0) return res.json({ nudged: 0 });

  const svcCount = {};
  for (const b of recentBookings) svcCount[b.service] = (svcCount[b.service] || 0) + 1;
  const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const query = cooperativeId ? { cooperativeId } : {};
  const providers = await Provider.find(query).populate('userId', 'name');
  const busyIds = new Set(recentBookings.map((b) => b.providerId.toString()));
  const idle = providers.filter((p) => !busyIds.has(p._id.toString()));

  let nudged = 0;
  for (const p of idle) {
    if (p.userId?._id) {
      emitTo(p.userId._id.toString(), 'ai:nudge', {
        message: `High demand for "${topService}" right now. Accept jobs to earn more!`,
        service: topService,
      });
      nudged++;
    }
  }
  res.json({ nudged, topService });
}

module.exports = { demandForecast, nudgeProviders };
