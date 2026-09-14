const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Welfare = require('../models/Welfare');
const Review = require('../models/Review');
const { emitTo, broadcastAll } = require('../socket');
const { haversine } = require('../utils/helpers');
const notify = require('../utils/notify');
const { uploadMedia } = require('../lib/cloudinary');

const BROADCAST_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Next scheduled occurrence for a recurring booking series.
function nextOccurrence(date, freq) {
  const d = new Date(date);
  if (freq === 'daily') { d.setDate(d.getDate() + 1); return d; }
  if (freq === 'weekly') { d.setDate(d.getDate() + 7); return d; }
  if (freq === 'biweekly') { d.setDate(d.getDate() + 14); return d; }
  if (freq === 'monthly') {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
  }
  return null;
}

// Weekday + local time (IST +05:30) of a stored instant, used to validate
// against the provider's weekly availability slots (Mon–Sun, HH:MM).
function slotParts(d) {
  const shifted = new Date(d.getTime() + 5.5 * 3600 * 1000); // UTC -> IST
  const pad = (n) => String(n).padStart(2, '0');
  return {
    day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()],
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

const inRange = (time, from, to) => {
  const t = time.replace(':', '') * 1;
  return t >= from.replace(':', '') * 1 && t < to.replace(':', '') * 1;
};

async function createBooking(req, res) {
  const { providerId, service, scheduledTime, isEmergency, price, recurrence, groupBooking } = req.body;
  if (!providerId || !service) return res.status(400).json({ message: 'providerId and service are required' });

  const provider = await Provider.findById(providerId).populate('userId');
  if (!provider) return res.status(404).json({ message: 'Provider not found' });
  if (!provider.verified) return res.status(400).json({ message: 'Provider is not verified' });

  // Time-slot enforcement: household must pick a slot the worker is actually free for.
  if (!scheduledTime) {
    return res.status(400).json({ message: 'Please choose a time slot from the provider\'s availability.' });
  }
  const start = new Date(scheduledTime);
  if (isNaN(start.getTime())) return res.status(400).json({ message: 'Please choose a valid time slot.' });
  if (start.getTime() < Date.now()) return res.status(400).json({ message: 'Please pick a future time slot.' });

  const { day: dayName, time } = slotParts(start);
  const slot = (provider.availabilitySlots || []).find((s) => s.day === dayName);
  if (!slot || !inRange(time, slot.from || '', slot.to || '')) {
    return res.status(400).json({
      message: `The provider is not available at ${time} on ${dayName}. Please pick from their open slots.`,
    });
  }

  // Atomic conflict guard: no other active booking may overlap this hour.
  const end = new Date(start.getTime() + 3600 * 1000);
  const existing = await Booking.findOne({
    providerId: provider._id,
    scheduledTime: { $gte: start, $lt: end },
    _id: { $ne: req.params.bookingId },
    status: { $nin: ['cancelled', 'disputed'] },
  });
  if (existing) {
    return res.status(409).json({ message: 'That time slot is already booked. Please choose another.' });
  }

  const effectivePrice = (price && Number(price) > 0)
    ? Number(price)
    : ((provider.hourlyRate && provider.hourlyRate > 0) ? provider.hourlyRate : 250);

  // Group / community booking: total price scales with the member count.
  let groupInfo = {};
  let totalPrice = effectivePrice;
  if (groupBooking && groupBooking.enabled) {
    const memberCount = Math.max(2, Math.floor(Number(groupBooking.memberCount) || 2));
    groupInfo = {
      enabled: true,
      groupName: String(groupBooking.groupName || 'Community Group').trim().slice(0, 80),
      memberCount,
    };
    totalPrice = effectivePrice * memberCount;
  }

  // Recurring series: validate + compute the next run automatically.
  let recurrenceInfo = { enabled: false, freq: 'none', repeats: 1, nextRunAt: null, seriesId: null };
  if (recurrence && recurrence.enabled) {
    const freq = ['daily', 'weekly', 'biweekly', 'monthly'].includes(recurrence.freq) ? recurrence.freq : 'weekly';
    const repeats = Math.max(2, Math.min(52, Math.floor(Number(recurrence.repeats) || 12)));
    const nextRunAt = nextOccurrence(start, freq);
    recurrenceInfo = { enabled: true, freq, repeats, nextRunAt, seriesId: require('crypto').randomUUID() };
  }

  const booking = await Booking.create({
    householdId: req.user.userId,
    providerId,
    cooperativeId: provider.cooperativeId,
    service,
    scheduledTime: start,
    isEmergency: !!isEmergency,
    priority: isEmergency ? 1 : 0,
    price: totalPrice,
    recurrence: recurrenceInfo,
    groupBooking: groupInfo,
  });

  const provUserId = provider.userId._id.toString();
  await notify(provUserId, 'booking_request', `New ${isEmergency ? 'EMERGENCY ' : ''}booking: ${service}`, booking._id);
  emitTo(provUserId, 'booking:new', booking);
  res.status(201).json(booking);
}

// Reschedule an existing booking to a new time slot the provider is free for.
// Only allowed while the booking is still plannable (requested/accepted).
async function rescheduleBooking(req, res) {
  const { scheduledTime } = req.body;
  if (!scheduledTime) return res.status(400).json({ message: 'Please choose a new time slot.' });

  const b = await Booking.findById(req.params.id).populate('householdId', 'name phone');
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId?._id?.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household can reschedule this booking' });
  if (!['requested', 'accepted'].includes(b.status))
    return res.status(400).json({ message: 'This booking can no longer be rescheduled.' });

  const start = new Date(scheduledTime);
  if (isNaN(start.getTime())) return res.status(400).json({ message: 'Please choose a valid time slot.' });
  if (start.getTime() < Date.now()) return res.status(400).json({ message: 'Please pick a future time slot.' });

  const provider = await Provider.findById(b.providerId).populate('userId');
  if (!provider) return res.status(404).json({ message: 'Provider not found' });

  const { day: dayName, time } = slotParts(start);
  const slot = (provider.availabilitySlots || []).find((s) => s.day === dayName);
  if (!slot || !inRange(time, slot.from || '', slot.to || '')) {
    return res.status(400).json({
      message: `The provider is not available at ${time} on ${dayName}. Please pick from their open slots.`,
    });
  }

  // Atomic conflict guard: no other active booking may overlap this hour.
  const end = new Date(start.getTime() + 3600 * 1000);
  const existing = await Booking.findOne({
    providerId: provider._id,
    scheduledTime: { $gte: start, $lt: end },
    _id: { $ne: b._id },
    status: { $nin: ['cancelled', 'disputed'] },
  });
  if (existing) {
    return res.status(409).json({ message: 'That time slot is already booked. Please choose another.' });
  }

  b.scheduledTime = start;
  await b.save();
  if (b.providerId?.userId?._id) {
    await notify(b.providerId.userId._id.toString(), 'booking_updated', `Booking rescheduled to ${start.toLocaleString()}`, b._id);
    emitTo(b.providerId.userId._id.toString(), 'booking:updated', b);
  }
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  res.json(b);
}

async function getBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone email address avatarUrl bio')
    .populate({
      path: 'providerId',
      populate: [
        { path: 'userId', select: 'name phone email avatar rating' },
        { path: 'cooperativeId', select: 'name registrationId region district address state contactPhone contactEmail logoUrl stampUrl signatureUrl secretaryName' },
      ],
    })
    .populate('cooperativeId', 'name registrationId region district address state contactPhone contactEmail logoUrl stampUrl signatureUrl secretaryName')
    .populate('chat.sender', 'name phone');
  if (!b) return res.status(404).json({ message: 'Not found' });

  // Ownership check — only the household, the provider, or an admin can read
  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId?._id?.toString() === userId;
  const provider = await Provider.findOne({ userId, _id: b.providerId });
  const isAdmin = role === 'Cooperative Admin' || role === 'Federation Admin';
  if (!isHousehold && !provider && !isAdmin)
    return res.status(403).json({ message: 'Forbidden' });

  const obj = b.toObject();
  // Provider should not see the raw completion OTP before completion
  if (!isHousehold && !isAdmin && b.status !== 'completed') {
    delete obj.completionOtp;
  }
  res.json(obj);
}

async function householdBookings(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const b = await Booking.find({ householdId: req.user.userId })
    .populate({
      path: 'providerId',
      populate: [
        { path: 'userId', select: 'name phone email avatar rating' },
        { path: 'cooperativeId', select: 'name registrationId region district address state contactPhone contactEmail logoUrl stampUrl signatureUrl secretaryName' },
      ],
    })
    .populate('cooperativeId', 'name registrationId region district address state contactPhone contactEmail logoUrl stampUrl signatureUrl secretaryName')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(b);
}

async function providerBookings(req, res) {
  const provider = await Provider.findOne({ userId: req.user.userId });
  if (!provider) return res.status(401).json({ message: 'Provider record not found — please log in again' });
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  const mongoose = require('mongoose');
  const pId = mongoose.Types.ObjectId.isValid(provider._id)
    ? new mongoose.Types.ObjectId(provider._id)
    : provider._id;

  const b = await Booking.find({
    $or: [
      { providerId: pId },
      { 'bulkDetails.allocations.providerId': pId },
      { 'bulkDetails.allocations': { $elemMatch: { providerId: pId } } },
    ],
  })
    .populate('householdId', 'name phone email avatarUrl')
    .populate('cooperativeId', 'name registrationId contactPhone')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const sanitized = b.map((doc) => {
    const obj = doc.toObject();
    if (obj.status !== 'completed') delete obj.completionOtp;
    return obj;
  });
  res.json(sanitized);
}

async function acceptBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const provider = await Provider.findOne({ userId: req.user.userId, _id: b.providerId });
  if (!provider) return res.status(403).json({ message: 'Not your booking' });
  b.status = 'accepted';
  await b.save();
  await notify(b.householdId._id.toString(), 'booking_accepted', 'Your booking was accepted', b._id);
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  emitTo(req.user.userId, 'booking:updated', b);
  res.json(b);
}

async function updateStatus(req, res) {
  const { status, beforePhoto, startPhoto, beforeDescription, startDescription, afterPhoto, completionPhoto, afterDescription, completionDescription, otp } = req.body;
  const allowed = ['in-progress', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });

  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const provider = await Provider.findOne({ userId: req.user.userId, _id: b.providerId });
  if (!provider) return res.status(403).json({ message: 'Forbidden' });

  // 1. WORK IN-PROGRESS TRANSITION: Requires Before Photo + Site Description
  if (status === 'in-progress') {
    const rawPhoto = beforePhoto || startPhoto;
    const description = beforeDescription || startDescription;
    if (!rawPhoto) {
      return res.status(400).json({ message: 'Please upload an on-site photo before starting work.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ message: 'Please provide a brief problem description or site diagnosis.' });
    }

    // Auto-upload photo to Cloudinary CDN for instant performance
    const cloudRes = await uploadMedia(rawPhoto, { folder: 'sahakargig/proofs/before' });
    const photo = cloudRes.url || rawPhoto;

    // Generate secure 4-digit completion OTP for household verification
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));

    b.startWorkProof = {
      photo,
      description: description.trim(),
      startedAt: new Date(),
    };
    b.completionOtp = generatedOtp;
    b.otpVerified = false;
    b.status = 'in-progress';
    await b.save();

    await notify(
      b.householdId._id.toString(),
      'booking_otp',
      `Worker started work. Your Job Completion OTP is ${generatedOtp}. Share this only after inspecting finished work.`,
      b._id
    );

    // Socket emit to household with OTP
    const hhPayload = b.toObject();
    emitTo(b.householdId._id.toString(), 'booking:updated', hhPayload);

    // Socket emit to provider (OTP hidden until customer shares it)
    const provPayload = b.toObject();
    delete provPayload.completionOtp;
    emitTo(req.user.userId, 'booking:updated', provPayload);

    return res.json(provPayload);
  }

  // 2. WORK COMPLETION TRANSITION: Requires After Photo + Resolution Notes + Customer OTP
  if (status === 'completed') {
    const rawPhoto = afterPhoto || completionPhoto;
    const description = afterDescription || completionDescription;
    if (!rawPhoto) {
      return res.status(400).json({ message: 'Please upload a photo of the completed work / solved problem.' });
    }
    if (!otp || String(otp).trim().length < 4) {
      return res.status(400).json({ message: 'Please enter the 4-digit customer verification OTP.' });
    }

    if (b.completionOtp && String(otp).trim() !== b.completionOtp) {
      return res.status(400).json({
        message: 'Invalid Completion OTP. Please enter the 4-digit code shown on the customer’s screen.',
      });
    }

    // Auto-upload photo to Cloudinary CDN for instant performance
    const cloudRes = await uploadMedia(rawPhoto, { folder: 'sahakargig/proofs/after' });
    const photo = cloudRes.url || rawPhoto;

    b.completionProof = {
      photo,
      description: (description && description.trim()) ? description.trim() : 'Work completed and verified on site.',
      completedAt: new Date(),
    };
    b.otpVerified = true;
    b.status = 'completed';
    await b.save();

    await notify(
      b.householdId._id.toString(),
      'booking_status',
      'Service completed & OTP verified successfully! You can now rate and review.',
      b._id
    );

    emitTo(b.householdId._id.toString(), 'booking:updated', b);
    emitTo(req.user.userId, 'booking:updated', b);

    // Recurring series — auto-create next occurrence after completion
    if (b.recurrence?.enabled && b.providerId) {
      await spawnNextOccurrence(b);
    }

    return res.json(b);
  }
}

// Creates the next booking of a recurring series (same provider + service).
async function spawnNextOccurrence(b) {
  try {
    if (b.recurrence?.freq === 'none' || !b.recurrence?.nextRunAt) return null;

    // Stop when the series has produced all planned occurrences.
    const done = await Booking.countDocuments({ 'recurrence.seriesId': b.recurrence.seriesId });
    if (done >= b.recurrence.repeats) return null;

    const provider = await Provider.findById(b.providerId);
    if (!provider) return null;

    const nextSlot = new Date(b.recurrence.nextRunAt);
    const { day: dayName, time } = slotParts(nextSlot);
    const slot = (provider.availabilitySlots || []).find((s) => s.day === dayName);
    if (!slot || !inRange(time, slot.from || '', slot.to || '')) return null; // series pauses if provider full

    const afterThat = nextOccurrence(nextSlot, b.recurrence.freq) || nextSlot;
    const copy = await Booking.create({
      householdId: b.householdId,
      providerId: b.providerId,
      cooperativeId: b.cooperativeId,
      service: b.service,
      scheduledTime: nextSlot,
      isEmergency: b.isEmergency,
      priority: b.priority,
      price: b.price,
      issue: undefined,
      dispatchMode: 'direct',
      recurrence: {
        enabled: true,
        freq: b.recurrence.freq,
        repeats: b.recurrence.repeats,
        nextRunAt: afterThat,
        seriesId: b.recurrence.seriesId,
      },
      groupBooking: b.groupBooking,
    });

    const provUserId = provider.userId;
    if (provUserId) {
      await notify(provUserId.toString(), 'booking_request', `Recurring ${b.service} booking for ${nextSlot.toLocaleString('en-IN')}`, copy._id);
      emitTo(provUserId.toString(), 'booking:new', copy);
    }
    const hhId = b.householdId?._id ? b.householdId._id.toString() : b.householdId.toString();
    emitTo(hhId, 'booking:new', copy);
    return copy;
  } catch (e) {
    console.error('[spawnNextOccurrence error]', e.message);
    return null;
  }
}

async function cancelBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId?._id?.toString() === userId;
  const provider = await Provider.findOne({ userId, _id: b.providerId });
  if (!isHousehold && !provider && role !== 'Cooperative Admin' && role !== 'Federation Admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // If household tries to cancel when work is already in-progress on site
  if (isHousehold && b.status === 'in-progress') {
    return res.status(409).json({ message: 'Worker is currently in-progress on site. Please contact worker or raise a dispute.' });
  }

  const { reason, reasonCategory, photoEvidence, cancelReason } = req.body || {};
  const reasonText = reason || cancelReason || req.body?.discardReason || (provider ? 'Discarded by provider' : 'Cancelled by household');

  b.status = 'cancelled';
  b.cancelReason = reasonText;
  if (b.dispatchMode === 'broadcast') b.broadcastStatus = 'cancelled';

  if (photoEvidence || reasonCategory) {
    b.discardProof = {
      reason: reasonText,
      category: reasonCategory || 'other',
      photo: photoEvidence || '',
      at: new Date(),
    };
  }

  await b.save();

  // Notify household if cancelled by worker/admin
  if (b.householdId?._id) {
    await notify(
      b.householdId._id.toString(),
      'booking_cancelled',
      `Booking for ${b.service} cancelled: ${reasonText}`,
      b._id
    );
    emitTo(b.householdId._id.toString(), 'booking:updated', b);
  }

  // Notify provider if cancelled by household/admin
  if (b.providerId?.userId?._id) {
    emitTo(b.providerId.userId._id.toString(), 'booking:updated', b);
  }

  // Withdraw the job from EVERY worker's live feed instantly (broadcast dispatch)
  if (b.dispatchMode === 'broadcast') {
    broadcastAll('booking:cancelled', { bookingId: b._id, service: b.service, targetCategory: b.targetCategory });
  }

  res.json({ success: true, message: 'Booking cancelled / discarded successfully.', booking: b });
}

async function disputeBooking(req, res) {
  const { reason, category, evidence } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'Dispute reason is required' });
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId._id.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household can raise a dispute' });
  if (['cancelled', 'disputed'].includes(b.status))
    return res.status(400).json({ message: `Cannot raise a dispute on a ${b.status} booking` });
  b.status = 'disputed';
  b.issue = reason;
  if (category) b.disputeCategory = category;

  if (Array.isArray(evidence) && evidence.length) {
    const cloudEvidence = await Promise.all(
      evidence.map(async (item) => {
        const res = await uploadMedia(item, { folder: 'sahakargig/disputes' });
        return res.url || item;
      })
    );
    b.disputeEvidence = cloudEvidence;
  }

  await b.save();
  const coop = await Cooperative.findById(b.cooperativeId);
  if (coop?.adminId) await notify(coop.adminId.toString(), 'dispute', 'A booking was disputed', b._id);
  if (b.providerId?.userId?._id) {
    await notify(b.providerId.userId._id.toString(), 'dispute', 'Booking disputed', b._id);
    emitTo(b.providerId.userId._id.toString(), 'booking:updated', b);
  }
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  res.json(b);
}

// Allow the household to withdraw an open dispute (revert to 'completed').
async function withdrawDispute(req, res) {
  const b = await Booking.findById(req.params.id).populate('householdId', 'name');
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId._id.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household can withdraw this dispute' });
  if (b.status !== 'disputed')
    return res.status(400).json({ message: 'Booking is not disputed' });
  b.status = 'completed';
  b.issue = undefined;
  b.disputeCategory = undefined;
  await b.save();
  if (b.providerId?.userId?._id) emitTo(b.providerId.userId._id.toString(), 'booking:updated', b);
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  res.json(b);
}

async function addChat(req, res) {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });

  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId?._id?.toString() === userId;
  const isProvider = b.providerId?.userId?._id?.toString() === userId;
  const isAdmin = role === 'Cooperative Admin' || role === 'Federation Admin';

  if (!isHousehold && !isProvider && !isAdmin) {
    return res.status(403).json({ message: 'Forbidden: You do not have access to this booking chat' });
  }

  const entry = { sender: userId, message, at: new Date() };
  b.chat.push(entry);
  await b.save();
  const chatPayload = { bookingId: b._id, message: entry };
  if (b.householdId?._id) emitTo(b.householdId._id.toString(), 'booking:chat', chatPayload);
  if (b.providerId?.userId?._id) emitTo(b.providerId.userId._id.toString(), 'booking:chat', chatPayload);
  if (b.cooperativeId) {
    const coop = await Cooperative.findById(b.cooperativeId);
    if (coop?.adminId) emitTo(coop.adminId.toString(), 'booking:chat', chatPayload);
  }
  res.json(b);
}

// ─────────────────────────────────────────────────────────────
// AI Geospatial Broadcast & First-Acceptance Dispatch
// ─────────────────────────────────────────────────────────────

// Household submits only Category + Locality (₹0 upfront). System
// broadcasts to all nearby verified providers with a matching skill.
async function createBroadcastBooking(req, res) {
  const { category, service, locationText, lat, lng, isEmergency, price, scheduledTime } = req.body;
  if (!category?.trim()) return res.status(400).json({ message: 'category is required' });

  const coordinates = {
    lat: Number(lat) || 28.6139,
    lng: Number(lng) || 77.2090,
  };
  const radiusKm = Math.max(1, Number(req.body.radiusKm) || 25);

  const booking = await Booking.create({
    householdId: req.user.userId,
    providerId: null,
    cooperativeId: null,
    dispatchMode: 'broadcast',
    broadcastStatus: 'broadcasting',
    targetCategory: category.trim(),
    locationText: locationText?.trim() || category.trim(),
    coordinates,
    service: service?.trim() || category.trim(),
    scheduledTime,
    isEmergency: !!isEmergency,
    priority: isEmergency ? 1 : 0,
    price: (price && Number(price) > 0) ? Number(price) : 250,
    status: 'requested',
    expiresAt: new Date(Date.now() + BROADCAST_TTL_MS),
  });

  // Find nearby verified providers holding the matching skill tag
  const providers = await Provider.find({
    verified: true,
    skills: { $in: [new RegExp(`^${category.trim()}$`, 'i')] },
  }).populate('userId', 'name');

  let notified = 0;
  for (const p of providers) {
    // Feed parity: providers without a saved geoLocation are treated as in-range
    // (matching availableBroadcastBookings) so they still get the instant push.
    const inRange = !p.geoLocation || haversine(coordinates, p.geoLocation) <= radiusKm;
    if (p.userId?._id && inRange) {
      emitTo(p.userId._id.toString(), 'booking:broadcast_new', {
        _id: booking._id,
        bookingId: booking._id,
        service: booking.service,
        targetCategory: booking.targetCategory,
        locationText: booking.locationText,
        coordinates: booking.coordinates,
        price: booking.price,
        isEmergency: booking.isEmergency,
        createdAt: booking.createdAt,
        householdId: { name: 'Household' },
      });
      notified++;
    }
  }

  res.status(201).json({ booking, nearbyProviders: notified });
}

// Household heartbeat while watching the radar page. Renews the offer's expiry
// so the job stays on workers' feeds — leaving the page stops the pings and the
// job expires after BROADCAST_TTL_MS.
async function keepaliveBroadcast(req, res) {
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Forbidden' });

  const active = b.dispatchMode === 'broadcast' && b.broadcastStatus === 'broadcasting' && b.providerId == null;
  if (active) {
    b.expiresAt = new Date(Date.now() + BROADCAST_TTL_MS);
    await b.save();
  }
  res.json({ ok: true, active, expiresAt: active ? b.expiresAt : null });
}

// Boost per-hour fare on active broadcast booking
async function boostBookingPrice(req, res) {
  const { boostAmount, newPrice } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.householdId.toString() !== req.user.userId.toString()) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  if (booking.dispatchMode !== 'broadcast' || booking.broadcastStatus !== 'broadcasting' || booking.providerId != null) {
    return res.status(400).json({ message: 'Booking is no longer active for price updates' });
  }

  if (newPrice && Number(newPrice) > booking.price) {
    booking.price = Number(newPrice);
  } else if (boostAmount && Number(boostAmount) > 0) {
    booking.price = (booking.price || 250) + Number(boostAmount);
  } else {
    booking.price = (booking.price || 250) + 50;
  }

  booking.expiresAt = new Date(Date.now() + BROADCAST_TTL_MS);
  await booking.save();

  // Re-broadcast updated price to nearby providers
  const providers = await Provider.find({
    verified: true,
    skills: { $in: [new RegExp(`^${booking.targetCategory.trim()}$`, 'i')] },
  }).populate('userId', 'name');

  for (const p of providers) {
    if (p.userId?._id) {
      emitTo(p.userId._id.toString(), 'booking:broadcast_new', {
        _id: booking._id,
        bookingId: booking._id,
        service: booking.service,
        targetCategory: booking.targetCategory,
        locationText: booking.locationText,
        coordinates: booking.coordinates,
        price: booking.price,
        isEmergency: booking.isEmergency,
        createdAt: booking.createdAt,
        householdId: { name: 'Household' },
      });
    }
  }

  return res.json({ success: true, price: booking.price, booking });
}

// Live broadcast feed for a provider — only jobs matching their skills,
// within range, and still awaiting first-acceptance. A household keeps a job
// alive with keepalive pings while it watches the radar page; leaving the page
// stops the pings and the job silently expires, so ghosts never linger.

async function availableBroadcastBookings(req, res) {
  try {
    const provider = await Provider.findOne({ userId: req.user.userId });
    if (!provider) return res.status(401).json({ message: 'Provider record not found — please log in again' });

    const { lat, lng, radius } = req.query;
    const radiusKm = parseFloat(radius) || 25;

    // Expire stale open broadcasts (household left without cancelling etc.)
    const now = new Date();
    const staleSince = new Date(Date.now() - BROADCAST_TTL_MS);
    await Booking.updateMany(
      {
        dispatchMode: 'broadcast',
        broadcastStatus: 'broadcasting',
        providerId: null,
        status: 'requested',
        expiresAt: { $lt: now },
      },
      { $set: { status: 'cancelled', broadcastStatus: 'expired', cancelReason: 'auto-expired' } }
    );

    const bookings = await Booking.find({
      dispatchMode: 'broadcast',
      broadcastStatus: 'broadcasting',
      providerId: null,
      status: 'requested',
      createdAt: { $gte: staleSince },
      expiresAt: { $gt: now },
    })
      .populate('householdId', 'name')
      .sort('-createdAt');

    const skills = (provider.skills || []).map((s) => s.toLowerCase());
    // Feed parity with the household radar: use the worker's fresh live GPS fix
    // when available, else their saved geoLocation.
    const liveGeo = require('../socket/liveLocations').getFresh(String(provider.userId));
    const providerGeo = (liveGeo && liveGeo.lat != null) ? { lat: liveGeo.lat, lng: liveGeo.lng } : provider.geoLocation;
    const within = (coords) => {
      if (lat && lng) return haversine({ lat: +lat, lng: +lng }, coords) <= radiusKm;
      if (providerGeo) return haversine(providerGeo, coords) <= radiusKm;
      return true;
    };

    const filtered = bookings.filter((b) => {
      const cat = (b.targetCategory || b.service || '').toLowerCase();
      const matchesSkill = skills.includes(cat) || skills.includes((b.service || '').toLowerCase());
      return matchesSkill && within(b.coordinates || {});
    });

    res.json(filtered);
  } catch (err) {
    console.error('[availableBroadcastBookings error]', err.message);
    res.status(500).json({ message: 'Error fetching available bookings' });
  }
}

// ATOMIC first-acceptance race lock (PRD §3.2).
// Guarantees zero double-assignments under concurrent taps.
async function acceptBroadcastRequest(req, res) {
  const { id: bookingId } = req.params;
  const provider = await Provider.findOne({ userId: req.user.userId })
    .populate('cooperativeId', 'name');
  if (!provider) return res.status(401).json({ message: 'Provider record not found — please log in again' });
  if (!provider.verified)
    return res.status(400).json({ message: 'Your provider account is not verified yet' });

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      dispatchMode: 'broadcast',
      broadcastStatus: 'broadcasting',
      providerId: null,
      status: 'requested',
    },
    {
      $set: {
        providerId: provider._id,
        cooperativeId: provider.cooperativeId,
        status: 'accepted',
        broadcastStatus: 'assigned',
        claimedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  )
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } })
    .populate('cooperativeId', 'name');

  if (!updatedBooking) {
    return res.status(409).json({ message: 'Job has already been claimed by another provider.' });
  }

  // Enrich the unlocked disclosure payload for the household
  const welfare = await Welfare.findOne({ providerId: provider._id }).lean();
  const providerBookings = await Booking.find({ providerId: provider._id }).select('_id status');
  const completedCount = providerBookings.filter((x) => x.status === 'completed').length;
  const ids = providerBookings.map((x) => x._id);
  const reviews = ids.length ? await Review.find({ bookingId: { $in: ids } }).sort('-createdAt') : [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const providerDetails = {
    _id: provider._id,
    name: provider.userId?.name || 'Provider',
    phone: provider.userId?.phone || '',
    cooperativeName: provider.cooperativeId?.name || '',
    skills: provider.skills || [],
    verified: provider.verified,
    eShramId: welfare?.eShramId || null,
    insuranceOptIn: welfare?.insuranceOptIn || false,
    insuranceProvider: welfare?.insuranceProvider || 'PMSBY (Pradhan Mantri Suraksha Bima Yojana)',
    rating: Number(avgRating.toFixed(1)),
    jobsCompleted: completedCount,
    reviews: reviews.slice(0, 3).map((r) => ({ rating: r.rating, comment: r.comment })),
  };

  await notify(
    updatedBooking.householdId._id.toString(),
    'booking_accepted',
    `${providerDetails.name} accepted your ${updatedBooking.service} request`,
    updatedBooking._id
  );

  // Real-time WebSocket Dispatch (§3.3)
  emitTo(updatedBooking.householdId._id.toString(), 'booking:assigned', {
    booking: updatedBooking,
    providerDetails,
  });
  broadcastAll('booking:claimed', { bookingId: updatedBooking._id }); // notify all other workers to remove card

  res.json({ booking: updatedBooking, providerDetails });
}

async function listAllBookings(req, res) {
  const query = {};
  if (req.user?.role === 'CooperativeAdmin' && req.user?.cooperativeId) {
    query.cooperativeId = req.user.cooperativeId;
  }
  const bookings = await Booking.find(query)
    .populate('providerId')
    .populate('householdId')
    .populate('cooperativeId')
    .sort({ createdAt: -1 })
    .lean();
  res.json(bookings);
}

async function createBulkRFP(req, res) {
  const { cooperativeId, service, price, workerCount, roles, durationDays, startDate, siteLocation, scopeOfWork } = req.body;

  let targetCoop = null;
  const mongoose = require('mongoose');
  if (cooperativeId && mongoose.isValidObjectId(cooperativeId)) {
    targetCoop = await Cooperative.findById(cooperativeId);
  }
  if (!targetCoop) {
    targetCoop = await Cooperative.findOne();
  }

  let defaultProvider = null;
  if (targetCoop?._id) {
    defaultProvider = await Provider.findOne({ cooperativeId: targetCoop._id });
  }
  if (!defaultProvider) {
    defaultProvider = await Provider.findOne();
  }

  const parsedRoles = Array.isArray(roles) && roles.length > 0
    ? roles.map((r) => ({ role: String(r.role || 'Labour'), count: Math.max(1, Number(r.count) || 1), dailyRate: Number(r.dailyRate) || 0 }))
    : [{ role: String(service || 'Labour').replace(/Bulk Crew:\s*\d+x\s*/i, '').split(' ')[0] || 'Labour', count: Math.max(1, Number(workerCount) || 1), dailyRate: 750 }];

  const totalWorkerCount = parsedRoles.reduce((sum, r) => sum + r.count, 0);
  const days = Math.max(1, Number(durationDays) || 1);
  const start = startDate ? new Date(startDate) : new Date(Date.now() + 24 * 3600 * 1000);

  const rolesSummary = parsedRoles.map((r) => `${r.count}x ${r.role}`).join(', ');
  const titleService = `Bulk RFP: ${rolesSummary} (${days} Days)`;

  const booking = await Booking.create({
    householdId: req.user.userId || req.user._id,
    providerId: defaultProvider?._id || undefined,
    cooperativeId: targetCoop?._id || undefined,
    service: titleService,
    scheduledTime: start,
    price: Number(price) || 0,
    isEmergency: false,
    groupBooking: {
      enabled: true,
      memberCount: totalWorkerCount,
    },
    bulkDetails: {
      isBulk: true,
      rolesNeeded: parsedRoles,
      durationDays: days,
      startDate: start,
      siteLocation: siteLocation || 'N/A',
      scopeOfWork: scopeOfWork || 'Institutional Bulk Requirement',
      quotation: {
        status: 'pending',
        totalAmount: Number(price) || 0,
        notes: '',
      },
      allocations: [],
    },
    status: 'requested',
    notes: `[Institutional Bulk RFP - ${totalWorkerCount} Workers (${rolesSummary}) for ${days} Days starting ${start.toLocaleDateString('en-IN')}] Site: ${siteLocation || 'N/A'}. Scope: ${scopeOfWork || 'N/A'}`,
  });

  if (targetCoop?.adminId) {
    const adminUserId = targetCoop.adminId.toString();
    try {
      await notify(
        adminUserId,
        'booking_request',
        `New Bulk RFP Received: ${rolesSummary} for ${days} Days starting ${start.toLocaleDateString('en-IN')}`,
        booking._id
      );
    } catch (nErr) {}
    emitTo(adminUserId, 'rfp:new', {
      booking,
      cooperativeId: targetCoop._id,
      workerCount: totalWorkerCount,
      durationDays: days,
      siteLocation,
      scopeOfWork,
      sender: req.user.name,
    });
    emitTo(adminUserId, 'booking:new', booking);
  }

  if (targetCoop?._id) {
    emitTo(`coop:${targetCoop._id}`, 'rfp:new', {
      booking,
      cooperativeId: targetCoop._id,
      workerCount: totalWorkerCount,
      durationDays: days,
      siteLocation,
      scopeOfWork,
      sender: req.user.name,
    });
  }
  broadcastAll('booking:new', booking);

  return res.status(201).json(booking);
}

async function acceptQuotation(req, res) {
  const { startDate } = req.body;
  const booking = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone email')
    .populate('cooperativeId');

  if (!booking) return res.status(404).json({ message: 'Bulk RFP not found' });
  if (booking.householdId._id.toString() !== req.user.userId) {
    return res.status(403).json({ message: 'Forbidden: Only the customer can accept the quotation' });
  }

  if (startDate) {
    booking.scheduledTime = new Date(startDate);
    if (!booking.bulkDetails) booking.bulkDetails = { isBulk: true };
    booking.bulkDetails.startDate = new Date(startDate);
  }

  if (booking.bulkDetails) {
    booking.bulkDetails.quotation.status = 'accepted';
    booking.bulkDetails.quotation.acceptedAt = new Date();
  }

  booking.status = 'accepted';
  booking.chat.push({
    sender: req.user.userId,
    message: `✅ Household accepted the Cooperative Quotation for ₹${(booking.price || 0).toLocaleString('en-IN')}. Scheduled Start Date: ${booking.scheduledTime ? new Date(booking.scheduledTime).toLocaleDateString('en-IN') : 'As agreed'}.`,
    at: new Date(),
  });

  await booking.save();

  if (booking.cooperativeId?.adminId) {
    const adminId = booking.cooperativeId.adminId.toString();
    try {
      await notify(
        adminId,
        'booking_accepted',
        `Quotation ACCEPTED by Household for RFP #${booking._id.toString().slice(-6)}. Required Start Date: ${booking.scheduledTime ? new Date(booking.scheduledTime).toLocaleDateString('en-IN') : 'Immediate'} for ${booking.bulkDetails?.durationDays || 1} Days! Allocate crew now.`,
        booking._id
      );
    } catch (e) {}
    emitTo(adminId, 'booking:updated', booking);
    emitTo(adminId, 'rfp:quotation_accepted', { bookingId: booking._id, booking });
  }

  emitTo(booking.householdId._id.toString(), 'booking:updated', booking);
  return res.json({ message: 'Quotation accepted successfully', booking });
}

async function uploadHouseholdPaymentProof(req, res) {
  const { ssUrl, amount, txnRef } = req.body;
  if (!ssUrl) return res.status(400).json({ message: 'Payment screenshot proof URL is required' });

  const booking = await Booking.findById(req.params.id)
    .populate('householdId', 'name')
    .populate('cooperativeId');

  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (booking.householdId._id.toString() !== req.user.userId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const Payment = require('../models/Payment');
  const WalletTransaction = require('../models/WalletTransaction');

  const paidAmount = (amount && Number(amount) > 0) ? Number(amount) : (booking.price || 0);

  if (!booking.bulkDetails) booking.bulkDetails = { isBulk: true };
  booking.bulkDetails.householdPaymentProof = {
    ssUrl,
    amount: paidAmount,
    txnRef: txnRef || `SS-TXN-${Date.now().toString().slice(-6)}`,
    uploadedAt: new Date(),
    verifiedByCoop: false,
  };
  booking.paymentStatus = 'paid';

  booking.chat.push({
    sender: req.user.userId,
    message: `💳 Household uploaded payment screenshot proof (Amount: ₹${paidAmount.toLocaleString('en-IN')}, Ref: ${txnRef || 'N/A'}). Awaiting Cooperative Admin verification.`,
    at: new Date(),
  });

  await booking.save();

  // Create payment record
  await Payment.create({
    bookingId: booking._id,
    amount: paidAmount,
    method: 'screenshot_proof',
    status: 'captured',
    razorpayPaymentId: txnRef || `SS-${Date.now()}`,
  });

  // Create wallet transaction record
  await WalletTransaction.create({
    userId: req.user.userId,
    type: 'debit',
    amount: paidAmount,
    method: 'screenshot_proof',
    bookingId: booking._id,
    note: `Bulk RFP Payment to Cooperative (Ref: ${txnRef || 'N/A'})`,
  });

  if (booking.cooperativeId?.adminId) {
    const adminId = booking.cooperativeId.adminId.toString();
    try {
      await notify(
        adminId,
        'payment',
        `Payment Screenshot Proof uploaded by Household for RFP #${booking._id.toString().slice(-6)}. Amount: ₹${paidAmount}. Please verify.`,
        booking._id
      );
    } catch (e) {}
    emitTo(adminId, 'booking:updated', booking);
  }

  emitTo(booking.householdId._id.toString(), 'booking:updated', booking);
  return res.json({ message: 'Payment screenshot proof uploaded successfully', booking });
}

module.exports = {
  createBooking,
  createBroadcastBooking,
  createBulkRFP,
  acceptQuotation,
  uploadHouseholdPaymentProof,
  keepaliveBroadcast,
  boostBookingPrice,
  availableBroadcastBookings,
  acceptBroadcastRequest,
  getBooking,
  householdBookings,
  providerBookings,
  listAllBookings,
  acceptBooking,
  updateStatus,
  cancelBooking,
  disputeBooking,
  withdrawDispute,
  rescheduleBooking,
  addChat,
  spawnNextOccurrence,
};
