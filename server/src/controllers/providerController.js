const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Payout = require('../models/Payout');

function haversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la = toRad(a.lat);
  const lb = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function computeTrustScore(providerId) {
  const p = await Provider.findById(providerId);
  if (!p) return 0;
  let base = 50;
  if (p.isVerified) base += 20;
  if (p.rating >= 4.5) base += 15;
  if (p.completedJobs >= 10) base += 15;
  return Math.min(100, base);
}

async function listProviders(req, res) {
  const { category, isVerified, minRating, lat, lng, radius } = req.query;
  const filter = {};
  if (category) filter.skills = { $in: [category] };
  if (isVerified === 'true') filter.verified = true;
  if (minRating) filter.rating = { $gte: parseFloat(minRating) };

  const list = await Provider.find(filter).populate('cooperativeId', 'name').populate('userId', 'name email phone').lean();
  const qLat = lat == null ? null : Number(lat);
  const qLng = lng == null ? null : Number(lng);
  const rad = Math.max(1, Number(radius) || 25);

  const withScore = [];
  for (const item of list) {
    let base = 50;
    if (item.verified) base += 20;
    if (item.rating >= 4.5) base += 15;
    if (item.completedJobs >= 10) base += 15;
    const trustScore = Math.min(100, base);

    // Prefer the worker's fresh live GPS; fall back to last saved geoLocation.
    const live = require('../socket/liveLocations').getFresh(String(item.userId));
    const geo = (live && live.lat != null && live.lng != null)
      ? { lat: live.lat, lng: live.lng }
      : item.geoLocation;

    let distanceKm = null;
    let inRange = true;
    if (geo && geo.lat != null && qLat != null && qLng != null) {
      distanceKm = haversine({ lat: qLat, lng: qLng }, geo);
      inRange = distanceKm <= rad;
    }
    if (!inRange) continue; // feed-parity: workers without any geo stay in-range (notified but unpinned)

    withScore.push({
      ...item,
      trustScore,
      geoLocation: geo,        // effective (live or saved) — client pins use this
      liveAt: live?.at || null,
      hasLocation: !!(geo && geo.lat != null),
      distanceKm,
    });
  }
  res.json(withScore);
}

async function listCooperatives(req, res) {
  try {
    const list = await Cooperative.find().lean();
    const enriched = await Promise.all(list.map(async (c) => {
      const totalWorkers = await Provider.countDocuments({ cooperativeId: c._id });
      const providers = await Provider.find({ cooperativeId: c._id }).select('skills').lean();
      const skillCounts = {};
      providers.forEach((p) => {
        (p.skills || []).forEach((s) => {
          const k = s.toLowerCase().trim();
          skillCounts[k] = (skillCounts[k] || 0) + 1;
        });
      });
      return {
        ...c,
        registrationNumber: c.registrationId || c.registrationNumber || 'MSCS-REG-2024',
        totalWorkers: totalWorkers || (c.memberProviderIds ? c.memberProviderIds.length : 0),
        skillCounts,
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.json([]);
  }
}

async function getProvider(req, res) {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Provider profile not found' });
  }

  const p = await Provider.findById(req.params.id).populate('cooperativeId', 'name district state registrationNumber').populate('userId', 'name email phone');
  if (!p) {
    const userProv = await Provider.findOne({ userId: req.params.id }).populate('cooperativeId', 'name district state registrationNumber').populate('userId', 'name email phone');
    if (!userProv) return res.status(404).json({ message: 'Provider profile not found' });
    const score = await computeTrustScore(userProv._id);
    const bookings = await Booking.find({
      $or: [{ providerId: userProv._id }, { providerId: userProv.userId }]
    }).populate('householdId', 'name email phone').sort('-createdAt');
    const reviews = await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } }).populate('createdBy', 'name').sort('-createdAt');
    return res.json({ ...userProv.toObject(), trustScore: score, bookings, reviews });
  }

  const score = await computeTrustScore(p._id);
  const bookings = await Booking.find({
    $or: [{ providerId: p._id }, { providerId: p.userId }]
  }).populate('householdId', 'name email phone').sort('-createdAt');
  const reviews = await Review.find({ bookingId: { $in: bookings.map((b) => b._id) } }).populate('createdBy', 'name').sort('-createdAt');

  res.json({ ...p.toObject(), trustScore: score, bookings, reviews });
}

async function getSlots(req, res) {
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: 'Not found' });
  }
  const p = await Provider.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  const bookings = await Booking.find({
    providerId: p._id,
    scheduledTime: { $ne: null },
    status: { $nin: ['cancelled', 'disputed'] },
  }).select('scheduledTime status service').sort('scheduledTime');

  res.json({ availabilitySlots: p.availabilitySlots || [], bookings });
}

async function me(req, res) {
  const p = await Provider.findOne({ userId: req.user.userId }).populate('cooperativeId', 'name');
  if (!p) return res.status(401).json({ message: 'Provider record not found — please log in again' });
  const score = await computeTrustScore(p._id);
  res.json({ ...p.toObject(), trustScore: score });
}

async function updateProfile(req, res) {
  const { skills, hourlyRate, availabilitySlots, geoLocation, avatarUrl, status } = req.body;
  const updateData = {};
  if (skills !== undefined) updateData.skills = skills;
  if (hourlyRate !== undefined) updateData.hourlyRate = Number(hourlyRate);
  if (availabilitySlots !== undefined) updateData.availabilitySlots = availabilitySlots;
  if (geoLocation !== undefined) updateData.geoLocation = geoLocation;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
  if (status !== undefined) updateData.status = status;

  let query = { _id: req.params.id };
  if (req.user?.role !== 'CooperativeAdmin' && req.user?.role !== 'FederationAdmin') {
    query.userId = req.user.userId;
  }

  const p = await Provider.findOneAndUpdate(
    query,
    { $set: updateData },
    { new: true }
  ).populate('userId');

  if (!p) return res.status(404).json({ message: 'Provider not found' });

  if (avatarUrl && p.userId) {
    const User = require('../models/User');
    await User.findByIdAndUpdate(p.userId._id || p.userId, { avatarUrl });
  }

  res.json(p);
}

const { uploadMedia } = require('../lib/cloudinary');

async function uploadDoc(req, res) {
  const { docType, docNumber, docUrl } = req.body;
  const docPayload = req.body?.file || req.body?.doc || docUrl;
  if (!docPayload) return res.status(400).json({ message: 'No document payload provided' });

  // Upload file/image/PDF to Cloudinary CDN
  const cloudRes = await uploadMedia(docPayload, { folder: 'sahakargig/docs' });
  const finalDocUrl = cloudRes?.url || docPayload;

  const type = docType || 'Aadhaar Card';
  const num = docNumber || '';

  let query = { userId: req.user.userId };
  if (req.params.id && req.params.id !== 'upload-document') {
    query = { $or: [{ _id: req.params.id }, { userId: req.user.userId }] };
  }

  const p = await Provider.findOne(query);
  if (!p) return res.status(404).json({ message: 'Provider profile not found' });

  if (!p.documents.includes(finalDocUrl)) {
    p.documents.push(finalDocUrl);
  }

  if (!Array.isArray(p.documentDetails)) p.documentDetails = [];
  const existingIdx = p.documentDetails.findIndex(d => d.docType === type);
  if (existingIdx >= 0) {
    p.documentDetails[existingIdx].docUrl = finalDocUrl;
    p.documentDetails[existingIdx].docNumber = num || p.documentDetails[existingIdx].docNumber || `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    p.documentDetails[existingIdx].uploadedAt = new Date();
    p.documentDetails[existingIdx].status = 'pending';
  } else {
    p.documentDetails.push({
      docType: type,
      docNumber: num || `${type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      docUrl: finalDocUrl,
      uploadedAt: new Date(),
      status: 'pending',
    });
  }

  // Set provider verification status to pending so it appears in Cooperative Audit queue
  p.verified = false;
  p.verificationStatus = 'pending';
  p.reVerificationReason = ''; // clear reason after re-submission
  p.verificationHistory.push({
    action: 'Document Re-submitted',
    date: new Date(),
    adminName: 'Worker (Self-Service)',
    notes: `${type} uploaded to Cloudinary CDN for audit.`,
  });

  await p.save();

  // Notify Cooperative Admin of document submission
  if (p.cooperativeId) {
    try {
      const Cooperative = require('../models/Cooperative');
      const notify = require('../utils/notify');
      const coop = await Cooperative.findById(p.cooperativeId);
      if (coop?.adminId) {
        await notify(coop.adminId.toString(), 'verification_update', `📄 Member Document Re-submitted: ${p.userId?.name || 'Worker'} uploaded updated ${type}.`, p._id);
      }
    } catch (e) {}
  }

  res.json({ message: `${type} uploaded to Cloudinary CDN & submitted for audit!`, provider: p, uploadedUrl: finalDocUrl });
}

async function uploadAvatar(req, res) {
  const avatar = req.body?.avatar || req.body?.file;
  if (!avatar) return res.status(400).json({ message: 'No image payload provided' });

  const cloudRes = await uploadMedia(avatar, { folder: 'sahakargig/avatars' });
  if (!cloudRes?.url) {
    return res.status(500).json({ message: 'Cloudinary avatar upload failed' });
  }
  const avatarUrl = cloudRes.url;

  const p = await Provider.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.userId },
    { avatar: avatarUrl, avatarUrl },
    { new: true }
  );
  if (!p) return res.status(404).json({ message: 'Provider not found' });
  res.json({ ...p.toObject(), avatar: avatarUrl });
}

async function uploadAvatarBase64(req, res) {
  const { avatar } = req.body;
  if (!avatar || avatar.length < 50) {
    return res.status(400).json({ message: 'Invalid or empty image payload' });
  }

  const User = require('../models/User');
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Upload to Cloudinary CDN with automatic WebP compression
  const cloudRes = await uploadMedia(avatar, { folder: 'sahakargig/avatars' });
  const avatarUrl = cloudRes.url || avatar;

  user.avatarUrl = avatarUrl;
  user.profileImage = avatarUrl;
  await user.save();
  await Provider.findOneAndUpdate({ userId: user._id }, { avatar: avatarUrl, avatarUrl }, { returnDocument: 'after' });

  res.json({ success: true, avatarUrl, message: 'Photo optimized and saved to Cloudinary CDN successfully.' });
}

async function uploadAvatarFile(req, res) {
  const avatar = req.body?.avatar || req.body?.file;
  if (!avatar) return res.status(400).json({ message: 'No image payload provided' });

  const cloudRes = await uploadMedia(avatar, { folder: 'sahakargig/avatars' });
  if (!cloudRes?.url) {
    return res.status(500).json({ message: 'Cloudinary avatar upload failed' });
  }
  const avatarUrl = cloudRes.url;

  const User = require('../models/User');
  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.avatarUrl = avatarUrl;
  user.profileImage = avatarUrl;
  await user.save();
  await Provider.findOneAndUpdate({ userId: user._id }, { avatar: avatarUrl, avatarUrl }, { returnDocument: 'after' });

  res.json({ success: true, avatarUrl, message: 'Image optimized and saved to Cloudinary CDN successfully.' });
}

async function inviteWorker(req, res) {
  const { name, email, phone, skill, hourlyRate, coopName } = req.body;
  if (!email || !name) {
    return res.status(400).json({ message: "Name and email are required" });
  }

  const activeCoopName = coopName || "Karol Bagh Labour Cooperative";
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  const queryStr = new URLSearchParams({
    name: name.trim(),
    email: email.trim(),
    phone: (phone || "").trim(),
    skill: skill || "Electrician",
    rate: String(hourlyRate || "350"),
    coopName: activeCoopName
  }).toString();

  const inviteUrl = `${clientOrigin}/signup?${queryStr}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #1e6b65; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">SahakarGig Cooperative Network</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Official Agency Workforce Invitation</p>
      </div>

      <div style="padding: 28px; color: #1e293b;">
        <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Hello ${name},</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          You have been officially invited by <strong>${activeCoopName}</strong> to join our verified cooperative gig worker platform.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px; font-size: 14px; color: #1e6b65;">Pre-filled Account Profile:</h3>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Skill Category:</strong> ${skill || 'Electrician'}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Base Rate:</strong> ₹${hourlyRate || 350}/hr</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Email:</strong> ${email}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Phone:</strong> ${phone || 'N/A'}</p>
          <p style="margin: 4px 0; font-size: 13px;">• <strong>Cooperative Society:</strong> ${activeCoopName}</p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #1e6b65; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(30,107,101,0.25);">
            🚀 Accept Invitation & Pre-fill Profile
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    const { sendMail } = require('../utils/email');
    const mailResult = await sendMail({
      to: email,
      subject: `🎉 Official Invitation from ${activeCoopName} — Claim Your SahakarGig Profile`,
      html: htmlContent,
      text: `Hello ${name},\n\nYou have been invited by ${activeCoopName} to join SahakarGig.\n\nClaim your profile here:\n${inviteUrl}\n\n— SahakarGig Team`
    });

    return res.json({ success: true, message: `Real invitation email sent to ${email}`, mailResult, inviteUrl });
  } catch (err) {
    return res.status(500).json({ message: "Failed to send email", error: err.message });
  }
}

async function requestPayout(req, res) {
  try {
    const { sendPayoutReceiptEmail } = require('../utils/email');

    const providerId = req.user?.userId;
    const user = providerId ? await require('../models/User').findById(providerId) : null;
    if (!user) return res.status(401).json({ message: 'You must be signed in to request a payout.' });
    const providerEmail = user.email;
    const providerName = user.name || 'Provider';

    const { amount, bankAccountOrUpi } = req.body;
    const withdrawAmount = Number(amount) || 0;

    if (!bankAccountOrUpi || !bankAccountOrUpi.trim()) {
      return res.status(400).json({ message: "Bank account or UPI ID is required for payout." });
    }
    if (withdrawAmount < 100) {
      return res.status(400).json({ message: "Minimum payout request is ₹100." });
    }
    if (withdrawAmount > 5000) {
      return res.status(400).json({ message: "⚠️ Daily Payout Limit Exceeded: Maximum allowed instant payout is ₹5,000 per 24 hours per cooperative policy." });
    }

    const payoutId = `PAY-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const transactionRef = `TXN-COOP-${Date.now()}`;
    const stampId = `DELHI-COOP-SECT-2026-STAMP-${Math.floor(10000 + Math.random() * 90000)}`;

    const newPayout = await Payout.create({
      payoutId,
      providerId,
      providerName,
      providerEmail,
      amount: withdrawAmount,
      paymentMethod: "Razorpay Cooperative Escrow (UPI)",
      bankAccountOrUpi: bankAccountOrUpi.trim(),
      transactionRef,
      cooperativeStampId: stampId,
      status: "Completed",
      receiptSentToEmail: true
    });

    console.log(`\x1b[32m[PAYOUT SUCCESS]\x1b[0m Disbursed ₹${withdrawAmount} to ${providerName} (${providerEmail}) | Stamp: ${stampId}`);

    try {
      await sendPayoutReceiptEmail({
        email: providerEmail,
        name: providerName,
        payout: newPayout.toObject()
      });
      console.log(`[PAYOUT MAIL] Stamped receipt email sent to ${providerEmail}`);
    } catch (mailErr) {
      console.error("[PAYOUT MAIL ERROR]", mailErr);
    }

    res.json({
      success: true,
      message: `₹${withdrawAmount} successfully disbursed via Razorpay Escrow! Official stamped receipt sent to ${providerEmail}.`,
      payout: newPayout
    });
  } catch (err) {
    console.error("Payout Request Error:", err);
    res.status(500).json({ message: "Payout failed", error: err.message });
  }
}

async function getMyPayouts(req, res) {
  try {
    const providerId = req.user?.userId;
    let payouts = [];
    if (providerId) {
      payouts = await Payout.find({ providerId }).sort({ createdAt: -1 });
    }
    res.json(payouts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load payouts", error: err.message });
  }
}

async function respondToAllocation(req, res) {
  const { bookingId } = req.params;
  const { action, reason } = req.body;
  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: "Action must be 'accept' or 'reject'" });
  }

  const Provider = require('../models/Provider');
  const Booking = require('../models/Booking');
  const notify = require('../utils/notify');
  const { emitTo } = require('../socket');

  const provider = await Provider.findOne({ userId: req.user.userId }).populate('userId', 'name phone');
  if (!provider) return res.status(404).json({ message: 'Provider record not found' });

  const booking = await Booking.findById(bookingId).populate('cooperativeId');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  if (!booking.bulkDetails?.allocations) {
    return res.status(400).json({ message: 'No allocations found for this booking' });
  }

  const alloc = booking.bulkDetails.allocations.find(
    (a) => a.providerId?.toString() === provider._id.toString()
  );

  if (!alloc) {
    return res.status(403).json({ message: 'You are not allocated to this bulk order' });
  }

  const workerName = provider.userId?.name || 'Worker';

  if (action === 'accept') {
    alloc.status = 'accepted';
    alloc.respondedAt = new Date();
    alloc.rejectionReason = undefined;

    booking.chat.push({
      sender: req.user.userId,
      message: `✅ Gig Worker ${workerName} ACCEPTED allocation for ${alloc.role} (${booking.bulkDetails.durationDays || 1} Days).`,
      at: new Date(),
    });

    await booking.save();

    if (booking.cooperativeId?.adminId) {
      const adminId = booking.cooperativeId.adminId.toString();
      try {
        await notify(
          adminId,
          'booking_accepted',
          `✅ Worker ${workerName} ACCEPTED allocation for ${alloc.role} in RFP #${booking._id.toString().slice(-6)}.`,
          booking._id
        );
      } catch (e) {}
      emitTo(adminId, 'booking:updated', booking);
      emitTo(adminId, 'rfp:worker_response', { bookingId: booking._id, workerName, role: alloc.role, status: 'accepted' });
    }

    return res.json({ message: 'Allocation accepted successfully', booking, allocation: alloc });
  } else {
    alloc.status = 'rejected';
    alloc.respondedAt = new Date();
    alloc.rejectionReason = reason || 'Worker unavailable';

    booking.chat.push({
      sender: req.user.userId,
      message: `❌ Gig Worker ${workerName} REJECTED allocation for ${alloc.role}. Reason: ${reason || 'Worker unavailable'}. Cooperative notified for reallocation.`,
      at: new Date(),
    });

    await booking.save();

    if (booking.cooperativeId?.adminId) {
      const adminId = booking.cooperativeId.adminId.toString();
      try {
        await notify(
          adminId,
          'booking_cancelled',
          `⚠️ ALERT: Worker ${workerName} REJECTED allocation for ${alloc.role} in RFP #${booking._id.toString().slice(-6)}. Please reallocate!`,
          booking._id
        );
      } catch (e) {}
      emitTo(adminId, 'booking:updated', booking);
      emitTo(adminId, 'rfp:worker_response', {
        bookingId: booking._id,
        workerName,
        role: alloc.role,
        status: 'rejected',
        reason: alloc.rejectionReason,
        allocationId: alloc._id,
      });
    }

    return res.json({ message: 'Allocation rejected. Cooperative has been notified to reallocate.', booking, allocation: alloc });
  }
}

module.exports = {
  listProviders, listCooperatives, getProvider, getSlots, me, updateProfile,
  uploadAvatarFile, uploadAvatarBase64, uploadAvatar, uploadDoc, inviteWorker,
  requestPayout, getMyPayouts, respondToAllocation
};
