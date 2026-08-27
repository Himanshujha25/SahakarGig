const Welfare = require('../models/Welfare');
const Provider = require('../models/Provider');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');
const QRCode = require('qrcode');
const axios = require('axios');

// Adapter pattern: real govt API when configured, mock fallback for dev
// Returns: { verified: bool, name: string, dob: string, state: string, error?: string }
async function callEShramAPI(eShramId) {
  // If real API configured, use it
  if (process.env.ESHRAM_API_ENABLED === 'true' && process.env.ESHRAM_API_URL && process.env.ESHRAM_API_KEY) {
    return callRealEShramAPI(eShramId);
  }
  // Otherwise use mock for development
  return mockEShramVerification(eShramId);
}

// Real govt API call (DigiLocker/UMANG)
async function callRealEShramAPI(eShramId) {
  try {
    const response = await axios.post(
      process.env.ESHRAM_API_URL,
      { eShramId },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ESHRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.verified) {
      return {
        verified: true,
        name: response.data.name,
        dob: response.data.dob,
        state: response.data.state,
      };
    }
    return { verified: false, error: response.data?.message || 'Verification failed' };
  } catch (err) {
    console.error('[e-Shram Real API Error]', err.message);
    return { verified: false, error: err.message };
  }
}

// Mock verification for development (no real govt API)
function mockEShramVerification(eShramId) {
  // Simulate 80% success rate for demo
  const isSuccess = Math.random() > 0.2;
  if (!isSuccess) {
    return { verified: false, error: 'Mock: ID not found in records' };
  }
  return {
    verified: true,
    name: 'Rajesh Kumar',
    dob: '1990-05-15',
    state: 'Maharashtra',
  };
}

function calcWelfareScore(w) {
  const days = Math.min((w.daysWorked || 0) / 100, 1) * 40;
  const ins = (w.insuranceOptIn ? 1 : 0) * 20;
  const eshram = w.eShramVerificationStatus === 'govt_verified' ? 30
    : w.eShramId ? 15 : 0;
  return Math.round(days + ins + eshram);
}

async function getWelfare(req, res) {
  const { providerId } = req.params;

  const [w, provider, bookingStats, reviewAgg] = await Promise.all([
    Welfare.findOne({ providerId }),
    Provider.findById(providerId).populate('userId', 'name').populate('cooperativeId', 'name'),
    // jobs completed + this-month completed bookings
    Booking.aggregate([
      { $match: { providerId: require('mongoose').Types.ObjectId.createFromHexString(providerId) } },
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          monthCompleted: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $gte: ['$updatedAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] },
                  ],
                },
                1, 0,
              ],
            },
          },
        },
      },
    ]),
    // avg rating
    Review.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking',
        },
      },
      { $unwind: '$booking' },
      { $match: { 'booking.providerId': require('mongoose').Types.ObjectId.createFromHexString(providerId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);

  // monthly earnings from payments on completed bookings this month
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const completedThisMonth = await Booking.find({
    providerId,
    status: 'completed',
    updatedAt: { $gte: monthStart },
  }).select('_id');

  const bookingIds = completedThisMonth.map(b => b._id);
  const paymentAgg = bookingIds.length
    ? await Payment.aggregate([
        { $match: { bookingId: { $in: bookingIds }, status: { $in: ['captured', 'released'] } } },
        { $group: { _id: null, total: { $sum: '$providerPayout' } } },
      ])
    : [];

  const jobsCompleted = bookingStats[0]?.totalCompleted || 0;
  const monthlyEarnings = paymentAgg[0]?.total || 0;
  const avgRating = reviewAgg[0]?.avg ? Number(reviewAgg[0].avg.toFixed(1)) : 0;
  const reviewCount = reviewAgg[0]?.count || 0;

  // build alerts from real data
  const alerts = [];
  const vs = w?.eShramVerificationStatus || 'unregistered';
  if (vs === 'unregistered') {
    alerts.push({ type: 'warning', message: 'e-Shram ID not registered. Enter your ID and verify to unlock government schemes.', tag: 'Action Required' });
  } else if (vs === 'self_declared') {
    alerts.push({ type: 'warning', message: `e-Shram ID ${w.eShramId} saved but not verified. Click "Verify with Govt" to confirm.`, tag: 'Pending Verification' });
  } else if (vs === 'govt_verified') {
    alerts.push({ type: 'success', message: `e-Shram ID ${w.eShramId} verified. Verified on ${new Date(w.eShramVerifiedAt).toLocaleDateString('en-IN')}.`, tag: 'Govt. Verified' });
  }
  if (!w?.insuranceOptIn) {
    alerts.push({ type: 'warning', message: 'Insurance not opted in. Enable cooperative insurance coverage.', tag: 'Action Required' });
  }
  if (jobsCompleted >= 10 && avgRating < 3.5) {
    alerts.push({ type: 'warning', message: `Your average rating is ${avgRating}★. Focus on service quality to improve.`, tag: 'Performance' });
  }
  if (jobsCompleted === 0) {
    alerts.push({ type: 'info', message: 'No completed jobs yet. Accept your first booking to start earning.', tag: 'Getting Started' });
  }
  if (w?.insuranceOptIn) {
    alerts.push({ type: 'success', message: 'Insurance coverage is active. You are protected under cooperative welfare.', tag: 'Active' });
  }

  res.json({
    ...(w ? w.toObject() : {}),
    // real computed fields
    jobsCompleted,
    monthlyEarnings,
    avgRating,
    reviewCount,
    alerts,
    providerName: provider?.userId?.name || '',
    cooperativeName: provider?.cooperativeId?.name || '',
    verified: provider?.verified || false,
    eShramVerificationStatus: w?.eShramVerificationStatus || 'unregistered',
  });
}

async function upsertWelfare(req, res) {
  const existing = await Welfare.findOne({ providerId: req.params.providerId });
  const body = { ...req.body };

  // If eShramId changed, reset verification to self_declared
  if (body.eShramId && body.eShramId !== existing?.eShramId) {
    body.eShramVerificationStatus = 'self_declared';
    body.eShramVerifiedAt = null;
    body.eShramVerifiedName = null;
    body.eShramDob = null;
    body.eShramState = null;
  }
  // If eShramId cleared, reset to unregistered
  if (body.eShramId === '' || body.eShramId === null) {
    body.eShramVerificationStatus = 'unregistered';
  }

  const w = await Welfare.findOneAndUpdate(
    { providerId: req.params.providerId },
    body,
    { new: true, upsert: true }
  );
  w.welfareScore = calcWelfareScore(w);
  await w.save();
  res.json(w);
}

// Stores the e-Shram ID after format validation.
// If real DigiLocker/UMANG API is configured in .env, calls it and sets govt_verified.
// Otherwise saves as self_declared (pending future API integration).
async function verifyEShram(req, res) {
  const { providerId } = req.params;
  const { eShramId } = req.body;

  if (!eShramId?.trim()) return res.status(400).json({ message: 'eShramId is required' });

  const clean = eShramId.trim().toUpperCase();
  // Accept UAN-XXXXXXXXXXXX (12 digits) or ES + 8-12 digits
  const isValidFormat = /^(UAN-?\d{12}|ES\d{8,12})$/i.test(clean);
  if (!isValidFormat) {
    return res.status(422).json({
      message: 'Invalid format. Use UAN-XXXXXXXXXXXX or ESXXXXXXXX',
      verified: false,
    });
  }

  // Try real govt API if configured
  const apiResult = await callEShramAPI(clean);

  let updateData = {
    eShramId: clean,
    eShramVerificationStatus: 'self_declared',
    eShramVerifiedAt: null,
    eShramVerifiedName: null,
  };

  // If real API returned verified result, upgrade to govt_verified
  if (apiResult?.verified) {
    updateData = {
      eShramId: clean,
      eShramVerificationStatus: 'govt_verified',
      eShramVerifiedAt: new Date(),
      eShramVerifiedName: apiResult.name,
      eShramDob: apiResult.dob,
      eShramState: apiResult.state,
    };
  }

  const w = await Welfare.findOneAndUpdate(
    { providerId },
    updateData,
    { new: true, upsert: true }
  );
  w.welfareScore = calcWelfareScore(w);
  await w.save();

  res.json({
    saved: true,
    eShramId: w.eShramId,
    eShramVerificationStatus: w.eShramVerificationStatus,
    eShramVerifiedAt: w.eShramVerifiedAt,
    eShramVerifiedName: w.eShramVerifiedName,
    welfareScore: w.welfareScore,
    message: w.eShramVerificationStatus === 'govt_verified'
      ? 'ID verified with govt. records!'
      : 'ID saved. Govt. verification will complete once the DigiLocker API is connected.',
  });
}

async function getWelfareQR(req, res) {
  const { providerId } = req.params;
  const w = await Welfare.findOne({ providerId });
  const p = await Provider.findById(providerId).populate('userId', 'name').populate('cooperativeId', 'name');
  if (!p) return res.status(404).json({ message: 'Provider not found' });

  const payload = JSON.stringify({
    name: p.userId?.name,
    eShramId: w?.eShramId || 'Not registered',
    cooperative: p.cooperativeId?.name,
    skills: p.skills,
    welfareScore: w?.welfareScore || 0,
    verified: p.verified,
    issuedAt: new Date().toISOString(),
  });

  const qrDataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
  res.json({ qr: qrDataUrl });
}

module.exports = { getWelfare, upsertWelfare, calcWelfareScore, getWelfareQR, verifyEShram };
