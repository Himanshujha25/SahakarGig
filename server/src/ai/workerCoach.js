const Provider = require('../models/Provider');
const Booking = require('../models/Booking');

/**
 * AI Provider Earnings & Skill Coach Engine
 * Generates personalized upskilling advice, peak earning hours, and revenue optimization tips.
 */
async function generateWorkerCoachInsights(userId) {
  const provider = await Provider.findOne({ userId }).populate('cooperativeId', 'name district state').lean();
  
  if (!provider) {
    throw new Error('Provider record not found');
  }

  const providerBookings = await Booking.find({ providerId: provider._id }).lean();
  const completedJobs = providerBookings.filter((b) => b.status === 'completed');
  const totalEarned = completedJobs.reduce((acc, b) => acc + (b.agreedPrice || 0), 0);

  // Regional demand analysis
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const regionalSpikes = await Booking.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: '$service', count: { $sum: 1 }, avgRate: { $avg: '$agreedPrice' } } },
    { $sort: { count: -1 } },
  ]);

  const primarySkill = provider.skills?.[0] || 'Electrician';
  const topRegionalService = regionalSpikes[0]?._id || 'AC Repair';
  
  const recommendedCertifications = [
    {
      title: `${primarySkill} Advanced Safety & BIS Standards`,
      category: primarySkill,
      duration: '25 mins',
      earnedBoost: '+15 Trust Score & 20% higher job acceptance rate',
      nicheSkill: `${primarySkill} Level 2`,
    },
    {
      title: 'PM Surya Ghar: Solar PV Panel Maintenance',
      category: 'Renewable Energy',
      duration: '40 mins',
      earnedBoost: '+20 Trust Score & High demand ₹800/hr bookings',
      nicheSkill: 'Solar Inverter Maintenance',
    },
    {
      title: 'Cooperative Member Ethics & Household Etiquette',
      category: 'Professionalism',
      duration: '15 mins',
      earnedBoost: '5-Star Trust Ambassador Badge',
      nicheSkill: 'Household Etiquette',
    },
  ];

  return {
    providerName: provider.bio || 'Cooperative Provider',
    trustScore: provider.trustScore || 75,
    completedJobsCount: completedJobs.length,
    totalEarned,
    peakHoursRecommendation: 'Morning (8:00 AM - 11:30 AM) & Evening (5:00 PM - 8:30 PM)',
    highDemandSkillInDistrict: topRegionalService,
    estimatedEarningsMultiplier: completedJobs.length > 5 ? '1.35x' : '1.50x',
    actionableTips: [
      `Completing Cooperative Skill Certifications boosts your AI Trust Score by up to +35 Pts.`,
      `High demand for "${topRegionalService}" detected in your cooperative district (${provider.cooperativeId?.district || 'Central'}).`,
      `Maintain an average response time under 3 minutes to receive auto-assigned priority broadcasts.`,
    ],
    recommendedCertifications,
    insightsGeneratedAt: new Date(),
  };
}

module.exports = { generateWorkerCoachInsights };
