const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Welfare = require('../models/Welfare');
const Review = require('../models/Review');
const { emitTo, broadcastAll } = require('../socket');
const { haversine } = require('../utils/helpers');
const notify = require('../utils/notify');

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
  const { providerId, service, scheduledTime, isEmergency, price } = req.body;
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

  const booking = await Booking.create({
    householdId: req.user.userId,
    providerId,
    cooperativeId: provider.cooperativeId,
    service,
    scheduledTime: start,
    isEmergency: !!isEmergency,
    priority: isEmergency ? 1 : 0,
    price: effectivePrice,
  });

  const provUserId = provider.userId._id.toString();
  await notify(provUserId, 'booking_request', `New ${isEmergency ? 'EMERGENCY ' : ''}booking: ${service}`, booking._id);
  emitTo(provUserId, 'booking:new', booking);
  res.status(201).json(booking);
}

async function getBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } })
    .populate('cooperativeId', 'name');
  if (!b) return res.status(404).json({ message: 'Not found' });

  // Ownership check — only the household, the provider, or an admin can read
  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId?._id?.toString() === userId;
  const provider = await Provider.findOne({ userId, _id: b.providerId });
  const isAdmin = role === 'Cooperative Admin' || role === 'Federation Admin';
  if (!isHousehold && !provider && !isAdmin)
    return res.status(403).json({ message: 'Forbidden' });

  res.json(b);
}

async function householdBookings(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const b = await Booking.find({ householdId: req.user.userId })
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name' } })
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
  const b = await Booking.find({ providerId: provider._id })
    .populate('householdId', 'name')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
  res.json(b);
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
  const { status } = req.body;
  const allowed = ['in-progress', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const provider = await Provider.findOne({ userId: req.user.userId, _id: b.providerId });
  if (!provider) return res.status(403).json({ message: 'Forbidden' });
  b.status = status;
  await b.save();
  await notify(b.householdId._id.toString(), 'booking_status', `Booking status: ${status}`, b._id);
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  emitTo(req.user.userId, 'booking:updated', b);
  res.json(b);
}

async function cancelBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId._id.toString() === userId;
  const provider = await Provider.findOne({ userId, _id: b.providerId });
  if (!isHousehold && !provider && role !== 'Cooperative Admin')
    return res.status(403).json({ message: 'Forbidden' });

  // Live broadcast dispatch is locked once a worker accepts — no ghost cancels.
  if (b.dispatchMode === 'broadcast' && b.providerId) {
    return res.status(409).json({ message: 'A worker already accepted this request — it is locked.' });
  }

  b.status = 'cancelled';
  if (b.dispatchMode === 'broadcast') b.broadcastStatus = 'cancelled';
  await b.save();
  await notify(b.householdId._id.toString(), 'booking_cancelled', 'Dispatch request cancelled', b._id);
  emitTo(b.householdId._id.toString(), 'booking:updated', b);
  // Withdraw the job from EVERY worker's live feed instantly (broadcast dispatch)
  if (b.dispatchMode === 'broadcast') {
    broadcastAll('booking:cancelled', { bookingId: b._id, service: b.service, targetCategory: b.targetCategory });
  }
  if (b.providerId?.userId?._id) emitTo(b.providerId.userId._id.toString(), 'booking:updated', b);
  res.json(b);
}

async function disputeBooking(req, res) {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'Dispute reason is required' });
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId._id.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household can raise a dispute' });
  b.status = 'disputed';
  b.issue = reason;
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

async function addChat(req, res) {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name phone')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name phone' } });
  if (!b) return res.status(404).json({ message: 'Not found' });
  const entry = { sender: req.user.userId, message, at: new Date() };
  b.chat.push(entry);
  await b.save();
  const chatPayload = { bookingId: b._id, message: entry };
  emitTo(b.householdId._id.toString(), 'booking:chat', chatPayload);
  if (b.providerId?.userId?._id) emitTo(b.providerId.userId._id.toString(), 'booking:chat', chatPayload);
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

// Live broadcast feed for a provider — only jobs matching their skills,
// within range, and still awaiting first-acceptance.
// Live broadcast feed for a provider — only jobs matching their skills,
// within range, and still awaiting first-acceptance. Broadcasts older than the
// TTL are silently expired so ghosts never linger on a worker's feed.
const BROADCAST_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function availableBroadcastBookings(req, res) {
  try {
    const provider = await Provider.findOne({ userId: req.user.userId });
    if (!provider) return res.status(401).json({ message: 'Provider record not found — please log in again' });

    const { lat, lng, radius } = req.query;
    const radiusKm = parseFloat(radius) || 25;

    // Expire stale open broadcasts (household left without cancelling etc.)
    const staleSince = new Date(Date.now() - BROADCAST_TTL_MS);
    await Booking.updateMany(
      {
        dispatchMode: 'broadcast',
        broadcastStatus: 'broadcasting',
        providerId: null,
        status: 'requested',
        createdAt: { $lt: staleSince },
      },
      { $set: { status: 'cancelled', broadcastStatus: 'cancelled', cancelReason: 'auto-expired' } }
    );

    const bookings = await Booking.find({
      dispatchMode: 'broadcast',
      broadcastStatus: 'broadcasting',
      providerId: null,
      status: 'requested',
      createdAt: { $gte: staleSince },
    })
      .populate('householdId', 'name')
      .sort('-createdAt');

    const skills = (provider.skills || []).map((s) => s.toLowerCase());
    const within = (coords) => {
      if (lat && lng) return haversine({ lat: +lat, lng: +lng }, coords) <= radiusKm;
      if (provider.geoLocation) return haversine(provider.geoLocation, coords) <= radiusKm;
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

module.exports = {
  createBooking, getBooking, householdBookings, providerBookings,
  acceptBooking, updateStatus, cancelBooking, disputeBooking, addChat,
  createBroadcastBooking, availableBroadcastBookings, acceptBroadcastRequest,
};
