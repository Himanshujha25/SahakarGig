const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const { emitTo } = require('../socket');
const {
  estimatePriceEngine,
  auditDisputeEngine,
  generateWorkerCoachInsights,
  verifyProviderTrustEngine,
  saarthiChatEngine,
  demandForecastEngine,
  translateContentEngine,
} = require('../ai');

async function demandForecast(req, res) {
  const days = parseInt(req.query.range) || 7;
  const result = await demandForecastEngine(days);
  res.json(result);
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

async function chatWithGroq(req, res) {
  const { message, history } = req.body || {};
  const result = await saarthiChatEngine(message, history);
  return res.json(result);
}

async function recommendProviders(req, res) {
  const householdId = req.user?.userId;
  const bookings = await Booking.find({ householdId }).select('service status').lean();
  const svcCount = {};
  for (const b of bookings) {
    if (['cancelled', 'disputed'].includes(b.status)) continue;
    svcCount[b.service] = (svcCount[b.service] || 0) + 1;
  }
  const topServices = Object.entries(svcCount)
    .sort((a, b) => b[1] - a[1])
    .map(([svc]) => svc)
    .slice(0, 3);
  const hasHistory = topServices.length > 0;

  const providers = await Provider.find({ verified: true })
    .populate('cooperativeId', 'name district state')
    .populate('userId', 'name email phone')
    .lean();

  const scored = providers.map((p) => {
    const skills = p.skills || [];
    const overlap = skills.filter((s) =>
      topServices.some((t) =>
        s.toLowerCase().includes(t.toLowerCase()) ||
        t.toLowerCase().includes(s.toLowerCase())
      )
    ).length;

    let score = 0;
    if (overlap > 0) score += 50 * overlap;
    if (p.verified) score += 15;
    if ((p.rating || 0) >= 4.5) score += 15;
    if ((p.completedJobs || 0) >= 10) score += 10;
    if ((p.trustScore || 0) >= 70) score += 10;

    const reason = hasHistory && overlap > 0
      ? `Matches your past ${topServices[0]} bookings`
      : p.rating >= 4.5
        ? 'Top-rated verified provider'
        : 'Highly trusted & verified';
    return { ...p, matchScore: score, overlap, reason };
  });

  const recommendations = scored
    .filter((p) => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  res.json({ recommendations, topServices, hasHistory });
}

async function translateContent(req, res) {
  const { text, targetLang = 'hi' } = req.body || {};
  const result = await translateContentEngine(text, targetLang);
  res.json(result);
}

// ── NEW AI FEATURES ──

// 1. AI Instant Job Price Estimator
async function estimatePrice(req, res) {
  const { service, description } = req.body || {};
  if (!service) {
    return res.status(400).json({ error: 'Service category is required' });
  }
  const estimate = await estimatePriceEngine(service, description);
  res.json(estimate);
}

// 2. AI Dispute Resolution & Audit
async function auditDispute(req, res) {
  const { bookingId } = req.body || {};
  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }
  const audit = await auditDisputeEngine(bookingId);
  res.json(audit);
}

// 3. AI Worker Earnings & Skill Coach Insights
async function workerCoach(req, res) {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const insights = await generateWorkerCoachInsights(userId);
  res.json(insights);
}

// 4. AI Provider Trust Score Verifier
async function verifyTrust(req, res) {
  const { providerId } = req.body || {};
  let targetId = providerId;

  if (!targetId && req.user?.userId) {
    const prov = await Provider.findOne({ userId: req.user.userId }).select('_id').lean();
    if (prov) targetId = prov._id;
  }

  if (!targetId) {
    return res.status(400).json({ error: 'Provider ID is required' });
  }

  const verification = await verifyProviderTrustEngine(targetId);
  res.json(verification);
}

module.exports = {
  demandForecast,
  nudgeProviders,
  chatWithGroq,
  recommendProviders,
  translateContent,
  estimatePrice,
  auditDispute,
  workerCoach,
  verifyTrust,
};
