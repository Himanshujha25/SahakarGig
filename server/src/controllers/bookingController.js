const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const { emitTo } = require('../socket');
const notify = require('../utils/notify');

async function createBooking(req, res) {
  const { providerId, service, scheduledTime, isEmergency, price } = req.body;
  if (!providerId || !service) return res.status(400).json({ message: 'providerId and service are required' });

  const provider = await Provider.findById(providerId).populate('userId');
  if (!provider) return res.status(404).json({ message: 'Provider not found' });
  if (!provider.verified) return res.status(400).json({ message: 'Provider is not verified' });

  const booking = await Booking.create({
    householdId: req.user.userId,
    providerId,
    cooperativeId: provider.cooperativeId,
    service,
    scheduledTime,
    isEmergency: !!isEmergency,
    priority: isEmergency ? 1 : 0,
    price: price || provider.hourlyRate || 0,
  });

  const provUserId = provider.userId._id.toString();
  await notify(provUserId, 'booking_request', `New ${isEmergency ? 'EMERGENCY ' : ''}booking: ${service}`, booking._id);
  emitTo(provUserId, 'booking:new', booking);
  res.status(201).json(booking);
}

async function getBooking(req, res) {
  const b = await Booking.findById(req.params.id)
    .populate('householdId', 'name')
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name' } });
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
  if (!provider) return res.status(403).json({ message: 'Not a provider' });
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
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  const provider = await Provider.findOne({ userId: req.user.userId, _id: b.providerId });
  if (!provider) return res.status(403).json({ message: 'Not your booking' });
  b.status = 'accepted';
  await b.save();
  await notify(b.householdId.toString(), 'booking_accepted', 'Your booking was accepted', b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);
  res.json(b);
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const allowed = ['in-progress', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ message: `Status must be one of: ${allowed.join(', ')}` });
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  const provider = await Provider.findOne({ userId: req.user.userId, _id: b.providerId });
  if (!provider) return res.status(403).json({ message: 'Forbidden' });
  b.status = status;
  await b.save();
  await notify(b.householdId.toString(), 'booking_status', `Booking status: ${status}`, b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);
  res.json(b);
}

async function cancelBooking(req, res) {
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  const userId = req.user.userId;
  const role = req.user.role;
  const isHousehold = b.householdId.toString() === userId;
  const provider = await Provider.findOne({ userId, _id: b.providerId });
  if (!isHousehold && !provider && role !== 'Cooperative Admin')
    return res.status(403).json({ message: 'Forbidden' });
  b.status = 'cancelled';
  await b.save();
  await notify(b.householdId.toString(), 'booking_cancelled', 'Booking cancelled', b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);
  res.json(b);
}

async function disputeBooking(req, res) {
  const { reason } = req.body;
  if (!reason?.trim()) return res.status(400).json({ message: 'Dispute reason is required' });
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  if (b.householdId.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Only the household can raise a dispute' });
  b.status = 'disputed';
  b.issue = reason;
  await b.save();
  const coop = await Cooperative.findById(b.cooperativeId);
  if (coop?.adminId) await notify(coop.adminId.toString(), 'dispute', 'A booking was disputed', b._id);
  const prov = await Provider.findById(b.providerId).populate('userId');
  if (prov?.userId?._id) await notify(prov.userId._id.toString(), 'dispute', 'Booking disputed', b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);
  res.json(b);
}

async function addChat(req, res) {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message cannot be empty' });
  const b = await Booking.findById(req.params.id);
  if (!b) return res.status(404).json({ message: 'Not found' });
  b.chat.push({ sender: req.user.userId, message });
  await b.save();
  emitTo(b.householdId.toString(), 'booking:updated', b);
  const prov = await Provider.findById(b.providerId).populate('userId');
  if (prov?.userId?._id) emitTo(prov.userId._id.toString(), 'booking:updated', b);
  res.json(b);
}

module.exports = {
  createBooking, getBooking, householdBookings, providerBookings,
  acceptBooking, updateStatus, cancelBooking, disputeBooking, addChat,
};
