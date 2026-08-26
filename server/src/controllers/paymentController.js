const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Cooperative = require('../models/Cooperative');
const Invoice = require('../models/Invoice');
const Welfare = require('../models/Welfare');
const Federation = require('../models/Federation');
const { invoiceNumber } = require('../utils/helpers');
const { calcWelfareScore } = require('./welfareController');
const notify = require('../utils/notify');
const { emitTo } = require('../socket');

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Step 1 — create a Razorpay order, return order_id + key to frontend
async function createOrder(req, res) {
  const { bookingId } = req.body;
  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.householdId.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Forbidden' });
  if (b.paymentStatus === 'paid')
    return res.status(400).json({ message: 'Already paid' });

  // Ensure price is valid (minimum ₹200 fallback for zero-price bookings)
  if (!b.price || b.price <= 0) {
    b.price = 200;
    await b.save();
  }

  const amountPaise = Math.round(b.price * 100); // Razorpay uses paise

  try {
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sg_${bookingId}`,
      notes: { bookingId: bookingId.toString(), service: b.service },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Razorpay Order Error]', err.message);
    res.status(500).json({ message: err.message || 'Razorpay order creation failed. Please check key configuration.' });
  }
}

// Step 2 — verify Razorpay signature, then release payment
async function verifyAndCapture(req, res) {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  // HMAC-SHA256 signature verification
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSig !== razorpay_signature)
    return res.status(400).json({ message: 'Payment verification failed — invalid signature' });

  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.paymentStatus === 'paid')
    return res.status(400).json({ message: 'Already paid' });

  // Commission split
  const coop = await Cooperative.findById(b.cooperativeId);
  const fedRate = coop?.federationId
    ? ((await Federation.findById(coop.federationId))?.commissionRate || 2) / 100
    : 0;
  const coopRate = (coop?.commissionRate || 8) / 100;
  const amount = b.price || 0;
  const federationCommission = Number((amount * fedRate).toFixed(2));
  const commission = Number(((amount - federationCommission) * coopRate).toFixed(2));
  const payout = Number((amount - federationCommission - commission).toFixed(2));

  const payment = await Payment.create({
    bookingId,
    amount,
    federationCommission,
    cooperativeCommission: commission,
    providerPayout: payout,
    status: 'released',
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });

  b.paymentStatus = 'paid';
  await b.save();

  const inv = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    bookingId,
    paymentId: payment._id,
    householdId: b.householdId,
    providerId: b.providerId,
    cooperativeId: b.cooperativeId,
    items: [{ description: b.service, qty: 1, rate: amount, amount }],
    tax: 0,
    total: amount,
  });

  const welfare = await Welfare.findOneAndUpdate(
    { providerId: b.providerId },
    { $inc: { totalEarnings: payout, daysWorked: 1 } },
    { new: true, upsert: true }
  );
  welfare.welfareScore = calcWelfareScore(welfare);
  await welfare.save();

  await notify(b.householdId.toString(), 'payment_released', `Payment of ₹${amount} released`, b._id);
  await notify(b.providerId.toString(), 'payment_released', `You received ₹${payout}`, b._id);
  emitTo(b.householdId.toString(), 'booking:updated', b);

  res.json({ payment, invoice: inv });
}

async function getInvoice(req, res) {
  const inv = await Invoice.findOne({ bookingId: req.params.bookingId })
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name' } });
  res.json(inv);
}

module.exports = { createOrder, verifyAndCapture, getInvoice };
