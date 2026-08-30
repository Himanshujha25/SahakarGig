const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Cooperative = require('../models/Cooperative');
const Invoice = require('../models/Invoice');
const Welfare = require('../models/Welfare');
const Federation = require('../models/Federation');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { invoiceNumber } = require('../utils/helpers');
const { calcWelfareScore } = require('./welfareController');
const { discountedAmount } = require('./subscriptionController');
const notify = require('../utils/notify');
const { emitTo } = require('../socket');
const { getRazorpayConfig, getRazorpayClient } = require('../lib/razorpay');

function getRazorpay() {
  return getRazorpayClient();
}

// Server-side coupon catalogue — the ONLY source of truth for discounts.
const COUPONS = {
  SAHAKAR20: { type: 'percent', value: 0.2, label: '20% OFF — Cooperative Special' },
  FIRSTGIG: { type: 'fixed', value: 50, label: '₹50 OFF — First Service Offer' },
  COOP50: { type: 'fixed', value: 50, label: '₹50 OFF — Community Pass' },
};

// Coupon-discounted payable (rupees), never below ₹1. Clients can only pass a
// validated coupon code — they can never influence the charged amount directly.
function computeFinalAmount(booking, couponCode) {
  let payable = Number(booking.price) || 0;
  if (couponCode) {
    const coupon = COUPONS[String(couponCode).trim().toUpperCase()];
    if (!coupon) return null; // invalid coupon — caller rejects with 400
    const discount =
      coupon.type === 'percent'
        ? Math.round(payable * coupon.value)
        : Math.min(coupon.value, payable);
    payable = Math.max(1, payable - discount);
  }
  return Math.max(1, Math.round(payable));
}

// Shared bookkeeping once money is in: Payment doc, invoice, welfare bump,
// notifications + socket broadcast.
async function settlePayment({ booking: b, amount, orderId, paymentId, method }) {
  const coop = await Cooperative.findById(b.cooperativeId);
  const fedRate = coop?.federationId
    ? ((await Federation.findById(coop.federationId))?.commissionRate || 2) / 100
    : 0;
  const coopRate = (coop?.commissionRate || 8) / 100;
  const federationCommission = Number((amount * fedRate).toFixed(2));
  const commission = Number(((amount - federationCommission) * coopRate).toFixed(2));
  const payout = Number((amount - federationCommission - commission).toFixed(2));

  const payment = await Payment.create({
    bookingId: b._id,
    amount,
    federationCommission,
    cooperativeCommission: commission,
    providerPayout: payout,
    status: 'released',
    method: method || 'razorpay',
    razorpayOrderId: orderId,
    razorpayPaymentId: paymentId,
  });

  b.paymentStatus = 'paid';
  await b.save();

  const inv = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    bookingId: b._id,
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
  const providerDoc = b.providerId ? await Provider.findById(b.providerId).select('userId') : null;
  if (providerDoc?.userId) {
    await notify(providerDoc.userId.toString(), 'payment_released', `You received ₹${payout}`, b._id);
  }
  emitTo(b.householdId.toString(), 'booking:updated', b);

  return { payment, invoice: inv };
}

// Step 1 — create a Razorpay order, return order_id + key to frontend
async function createOrder(req, res) {
  const { bookingId, couponCode } = req.body;
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

  // Coupon discount is validated & applied server-side — clients can't set the amount.
  const finalAmount = computeFinalAmount(b, couponCode);
  if (finalAmount === null) return res.status(400).json({ message: 'Invalid coupon code' });

  // Active subscription reward — real discount applied server-side.
  const charged = await discountedAmount(req.user.userId, finalAmount);

  const amountPaise = Math.round(charged * 100); // Razorpay uses paise

  try {
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sg_${bookingId}`,
      notes: { bookingId: bookingId.toString(), service: b.service },
    });

    const { keyId } = getRazorpayConfig();
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
    });
  } catch (err) {
    console.error('[Razorpay Order Error]:', err.message);
    res.status(500).json({ message: `Could not create payment order: ${err.message}` });
  }
}

// Step 2 — verify Razorpay signature, then release payment
async function verifyAndCapture(req, res) {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing Razorpay verification details' });
  }

  // HMAC-SHA256 signature verification
  const { keySecret } = getRazorpayConfig();
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSig = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  if (expectedSig !== razorpay_signature)
    return res.status(400).json({ message: 'Payment verification failed — invalid signature' });

  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.paymentStatus === 'paid')
    return res.status(400).json({ message: 'Already paid' });

  // Trust the gateway's own payment record — the client can no longer report the amount.
  let amount = 0;
  try {
    const paid = await getRazorpay().payments.fetch(razorpay_payment_id);
    amount = Number(paid?.amount) / 100; // paise -> rupees
  } catch (err) {
    console.error('[Razorpay Payment Fetch Error]:', err.message);
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    amount = Number(b.price) || 0;
  }

  const { payment, invoice } = await settlePayment({
    booking: b,
    amount,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    method: 'razorpay',
  });

  res.json({ payment, invoice });
}

// Step 1.5 (Wallet) — pay a booking instantly from the household wallet balance.
async function walletPay(req, res) {
  const { bookingId, couponCode } = req.body;

  const b = await Booking.findById(bookingId);
  if (!b) return res.status(404).json({ message: 'Booking not found' });
  if (b.householdId.toString() !== req.user.userId)
    return res.status(403).json({ message: 'Forbidden' });
  if (b.paymentStatus === 'paid')
    return res.status(400).json({ message: 'Already paid' });

  if (!b.price || b.price <= 0) {
    b.price = 200;
    await b.save();
  }

  const finalAmount = computeFinalAmount(b, couponCode);
  if (finalAmount === null) return res.status(400).json({ message: 'Invalid coupon code' });
  const charged = await discountedAmount(req.user.userId, finalAmount);

  const user = await User.findById(req.user.userId);
  const balance = Number(user?.walletBalance || 0);
  if (balance < charged) {
    return res.status(402).json({
      message: `Insufficient wallet balance (₹${balance}). Top up to continue.`,
      balance,
      required: charged,
    });
  }

  const txn = await WalletTransaction.create({
    userId: user._id,
    type: 'debit',
    amount: charged,
    method: 'booking-payment',
    bookingId: b._id,
    note: `Payment for ${b.service}`,
  });

  user.walletBalance = Number((balance - charged).toFixed(2));
  await user.save();

  const { payment, invoice } = await settlePayment({
    booking: b,
    amount: charged,
    orderId: `wallet_${txn._id}`,
    paymentId: `wallet_${txn._id}`,
    method: 'wallet',
  });

  res.json({ payment, invoice, walletBalance: user.walletBalance });
}

async function getInvoice(req, res) {
  const inv = await Invoice.findOne({ bookingId: req.params.bookingId })
    .populate({ path: 'providerId', populate: { path: 'userId', select: 'name' } });
  res.json(inv);
}

module.exports = { createOrder, verifyAndCapture, walletPay, getInvoice };
