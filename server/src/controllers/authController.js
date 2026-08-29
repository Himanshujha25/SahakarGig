const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Otp = require('../models/Otp');
const Cooperative = require('../models/Cooperative');
const Provider = require('../models/Provider');
const Federation = require('../models/Federation');
const { signToken } = require('../utils/helpers');
const { sendOtpEmail } = require('../utils/email');

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  role: u.role,
  email: u.email,
  emailVerified: !!u.emailVerified,
});

/* ----------------------------- OTP helpers ------------------------------ */

async function issueOtp(email, purpose, name) {
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.deleteMany({ email, purpose });
  await Otp.create({
    email,
    code: await bcrypt.hash(code, 10),
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });
  await sendOtpEmail({ email, name, code, purpose, minutes: OTP_TTL_MINUTES });
  return true;
}

async function verifyOtp(email, code, purpose) {
  if (!code) return { ok: false, message: 'Please enter the OTP.' };
  const rec = await Otp.findOne({ email, purpose, used: false }).sort({ createdAt: -1 });
  if (!rec) return { ok: false, message: 'No active OTP found. Please request a new one.' };
  if (rec.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: rec._id });
    return { ok: false, message: 'OTP has expired. Please request a new one.' };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: rec._id });
    return { ok: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }
  const ok = await bcrypt.compare(String(code), rec.code);
  if (!ok) {
    await Otp.updateOne({ _id: rec._id }, { $inc: { attempts: 1 } });
    return { ok: false, message: 'Incorrect OTP. Please try again.' };
  }
  await Otp.updateOne({ _id: rec._id }, { used: true });
  return { ok: true };
}


async function signup(req, res) {
  const {
    name, phone, email, password, role, address, geoLocation,
    cooperativeId, cooperative, federation, otp,
  } = req.body;

  if (!['Household', 'Provider', 'Cooperative Admin', 'Federation Admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!password || String(password).length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (await User.findOne({ email: normalizedEmail })) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  // Hard gate: no OTP => no account. The code must have been emailed to this
  // exact address and confirmed by whoever owns the inbox.
  if (!otp) {
    return res.status(400).json({ message: 'Please verify your email with the OTP before creating your account.' });
  }
  const check = await verifyOtp(normalizedEmail, otp, 'signup');
  if (!check.ok) return res.status(400).json({ message: check.message });

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({
      name: String(name || '').trim(), phone, email: normalizedEmail, passwordHash, role, address, geoLocation,
      emailVerified: true, // only ever true here — proven by the confirmed signup OTP
    });
  } catch (e) {
    // Unique-index race: two simultaneous signups with the same email.
    if (e && e.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    throw e;
  }

  if (role === 'Federation Admin') {
    const fed = await Federation.create({
      name: federation?.name || `${name}'s Federation`,
      registrationId: federation?.registrationId || `FED-${Date.now()}`,
      region: federation?.region || '',
      adminId: user._id,
      commissionRate: federation?.commissionRate || 2,
    });
    // link existing cooperatives in the same region (case-insensitive)
    await Cooperative.updateMany(
      { region: { $regex: new RegExp(`^${fed.region.trim()}$`, 'i') } },
      { federationId: fed._id }
    );
    await Federation.findByIdAndUpdate(fed._id, {
      cooperativeIds: (await Cooperative.find({ federationId: fed._id })).map((c) => c._id),
    });
  }

  if (role === 'Cooperative Admin') {
    await Cooperative.create({
      name: cooperative?.name || `${name}'s Cooperative`,
      registrationId: cooperative?.registrationId || `REG-${Date.now()}`,
      region: cooperative?.region || '',
      adminId: user._id,
      commissionRate: cooperative?.commissionRate || 8,
    });
  }

  if (role === 'Provider') {
    if (!cooperativeId) return res.status(400).json({ message: 'Provider must select a cooperative' });
    const coop = await Cooperative.findById(cooperativeId);
    if (!coop) return res.status(400).json({ message: 'Cooperative not found' });
    const provider = await Provider.create({ userId: user._id, cooperativeId, geoLocation });
    await Cooperative.findByIdAndUpdate(cooperativeId, { $push: { memberProviderIds: provider._id } });
  }

  const token = signToken(user);
  res.status(201).json({
    token,
    user: publicUser(user),
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').trim().toLowerCase() });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
}

async function me(req, res) {
  const user = await User.findById(req.user.userId).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'Account not found' });
  res.json({ ...user.toObject(), id: user._id, emailVerified: !!user.emailVerified });
}

/* --------------------------- Update profile ----------------------------- */

async function updateMe(req, res) {
  const me = await User.findById(req.user.userId);
  if (!me) return res.status(401).json({ message: 'Account not found.' });
  const { name, phone, email, code } = req.body;

  if (name !== undefined && typeof name === 'string' && name.trim()) me.name = name.trim();
  if (phone !== undefined) me.phone = phone;

  // Real household profile fields — persisted, no demo values.
  if (req.body.address !== undefined && typeof req.body.address === 'string') {
    me.address = req.body.address.trim() || undefined;
  }
  if (req.body.geoLocation !== undefined) {
    const lat = Number(req.body.geoLocation?.lat);
    const lng = Number(req.body.geoLocation?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) me.geoLocation = { lat, lng };
  }
  if (req.body.emergencyContact !== undefined) {
    const ecName = String(req.body.emergencyContact?.name || '').trim();
    const ecPhone = String(req.body.emergencyContact?.phone || '').trim();
    if (ecName || ecPhone) me.emergencyContact = { name: ecName || undefined, phone: ecPhone || undefined };
  }
  if (req.body.householdSize !== undefined) {
    const sz = Number(req.body.householdSize);
    me.householdSize = (Number.isFinite(sz) && sz > 0) ? Math.floor(sz) : undefined;
  }
  if (req.body.specialInstructions !== undefined) {
    me.specialInstructions = String(req.body.specialInstructions).trim() || undefined;
  }
  if (req.body.prefLang !== undefined) {
    me.prefLang = String(req.body.prefLang).trim() || undefined;
  }

  // Notification preferences — whitelisted channel toggles only.
  if (req.body.notificationPrefs !== undefined && req.body.notificationPrefs !== null) {
    const prefs = req.body.notificationPrefs;
    if (typeof prefs === 'object') {
      const next = Object.assign({}, me.notificationPrefs || {}, {
        inApp: prefs.inApp !== undefined ? !!prefs.inApp : me.notificationPrefs?.inApp,
        email: prefs.email !== undefined ? !!prefs.email : me.notificationPrefs?.email,
        promotional: prefs.promotional !== undefined ? !!prefs.promotional : me.notificationPrefs?.promotional,
      });
      me.notificationPrefs = next;
    }
  }

  // Replace the whole address book (addresses are also managed granularly below).
  if (Array.isArray(req.body.addresses)) {
    me.addresses = req.body.addresses
      .filter((a) => a && typeof a.address === 'string' && a.address.trim())
      .map((a, i) => ({
        label: String(a.label || (i === 0 ? 'Home' : `Address ${i + 1}`)).trim() || 'Address',
        address: a.address.trim(),
        geoLocation: Number.isFinite(Number(a.geoLocation?.lat)) && Number.isFinite(Number(a.geoLocation?.lng))
          ? { lat: Number(a.geoLocation.lat), lng: Number(a.geoLocation.lng) }
          : undefined,
        isPrimary: i === 0 ? true : !!a.isPrimary,
      }));
    const hasPrimary = me.addresses.some((a) => a.isPrimary);
    if (me.addresses.length && !hasPrimary) me.addresses[0].isPrimary = true;
    else if (me.addresses.length > 1 && me.addresses.filter((a) => a.isPrimary).length > 1) {
      me.addresses.forEach((a, i) => { a.isPrimary = i === 0; });
    }
  }

  if (Array.isArray(req.body.familyMembers)) {
    me.familyMembers = req.body.familyMembers
      .filter((f) => f && typeof f.name === 'string' && f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        relation: String(f.relation || 'Family').trim() || 'Family',
        phone: String(f.phone || '').trim() || undefined,
        age: Number.isFinite(Number(f.age)) ? Number(f.age) : undefined,
      }));
  }

  if (email !== undefined) {
    const normalized = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (normalized !== me.email.toLowerCase()) {
      const existing = await User.findOne({ email: normalized });
      if (existing) return res.status(400).json({ message: 'That email address is already in use.' });
      if (!code) {
        return res.status(400).json({ message: 'Please verify your new email address with the OTP sent to it.' });
      }
      const check = await verifyOtp(normalized, code, 'change_email');
      if (!check.ok) return res.status(400).json({ message: check.message });
      me.email = normalized;
      me.emailVerified = true;
    }
  }

  await me.save();
  res.json({ message: 'Profile updated successfully.', user: publicUser(me) });
}

/* -------------------------------- Send OTP ------------------------------ */

async function sendOtp(req, res) {
  const { email, purpose } = req.body;
  const normalized = String(email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!['signup', 'reset_password', 'change_password', 'verify_email', 'change_email'].includes(purpose)) {
    return res.status(400).json({ message: 'Invalid OTP purpose.' });
  }

  if (purpose === 'signup') {
    if (await User.findOne({ email: normalized })) {
      return res.status(400).json({ message: 'Email already registered. Please sign in instead.' });
    }
    await issueOtp(normalized, purpose);
    return res.json({ message: 'OTP sent to your email. Check your inbox (and spam folder).' });
  }

  if (purpose === 'reset_password') {
    const user = await User.findOne({ email: normalized });
    // Generic response for the raw send-otp path (used by "Resend" inside the
    // reset flow, where registration was already verified by forgotPasswordInitiate).
    if (user) await issueOtp(normalized, purpose, user.name);
    return res.json({ message: 'If an account exists for that email, an OTP has been sent.' });
  }

  // Authenticated purposes
  const me = await User.findById(req.user?.userId);
  if (!me) return res.status(401).json({ message: 'Authentication required.' });

  if (purpose === 'change_password' || purpose === 'verify_email') {
    if (normalized !== me.email.toLowerCase()) {
      return res.status(403).json({ message: 'Email does not match your account.' });
    }
  }
  if (purpose === 'change_email') {
    if (normalized === me.email.toLowerCase()) {
      return res.status(400).json({ message: 'That is already your current email.' });
    }
    const existing = await User.findOne({ email: normalized });
    if (existing) return res.status(400).json({ message: 'That email address is already in use.' });
  }

  await issueOtp(normalized, purpose, me.name);
  res.json({ message: 'OTP sent to your email. Check your inbox (and spam folder).' });
}

/* ------------------- Forgot password: initiate (secure) ------------------ */

/**
 * Step 1 of the password-reset flow. Cross-checks that the email actually
 * belongs to a registered account BEFORE any OTP is generated or emailed.
 * Unknown/unregistered emails are rejected here so no reset code can be
 * triggered for addresses that were never signed up. A dedicated, strict
 * rate limit protects this endpoint from email-enumeration probing.
 */
async function forgotPasswordInitiate(req, res) {
  const { email } = req.body;
  const normalized = String(email || '').trim().toLowerCase();

  if (!EMAIL_RE.test(normalized)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  const user = await User.findOne({ email: normalized });
  if (!user) {
    return res.status(404).json({
      message: 'No account is registered with this email address. Please check the spelling or create a new account.',
      emailRegistered: false,
    });
  }

  await issueOtp(normalized, 'reset_password', user.name);
  res.json({
    message: `We've sent a 6-digit reset code to ${maskedEmail(normalized)}. Check your inbox (and spam folder).`,
    emailRegistered: true,
  });
}

// Help desk display form — hides most of the address in emails we echo back.
function maskedEmail(email) {
  const [local, domain] = email.split('@');
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

/* ---------------------------- Reset password ---------------------------- */

async function resetPassword(req, res) {
  const { email, code, newPassword } = req.body;
  const normalized = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }
  const user = await User.findOne({ email: normalized });
  if (!user) return res.status(400).json({ message: 'No account found for that email.' });

  const check = await verifyOtp(normalized, code, 'reset_password');
  if (!check.ok) return res.status(400).json({ message: check.message });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
}

/* --------------------------- Change password ---------------------------- */

async function changePassword(req, res) {
  const { currentPassword, newPassword, code } = req.body;
  const me = await User.findById(req.user.userId);
  if (!me) return res.status(401).json({ message: 'Account not found.' });

  if (!currentPassword) return res.status(400).json({ message: 'Please enter your current password.' });
  const okCurrent = await bcrypt.compare(currentPassword, me.passwordHash);
  if (!okCurrent) return res.status(400).json({ message: 'Your current password is incorrect.' });
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  const check = await verifyOtp(me.email, code, 'change_password');
  if (!check.ok) return res.status(400).json({ message: check.message });

  me.passwordHash = await bcrypt.hash(newPassword, 10);
  await me.save();
  res.json({ message: 'Password updated successfully.' });
}

/* ---------------------------- Verify email ------------------------------ */

async function verifyEmail(req, res) {
  const { code } = req.body;
  const me = await User.findById(req.user.userId);
  if (!me) return res.status(401).json({ message: 'Account not found.' });
  if (me.emailVerified) {
    return res.json({ message: 'Your email is already verified.', emailVerified: true });
  }
  const check = await verifyOtp(me.email, code, 'verify_email');
  if (!check.ok) return res.status(400).json({ message: check.message });
  me.emailVerified = true;
  await me.save();
  res.json({ message: 'Email verified successfully.', emailVerified: true });
}

/* -------------------- Address book (saved addresses) -------------------- */

async function ensureHousehold(req, res) {
  const me = await User.findById(req.user.userId);
  if (!me) return res.status(401).json({ message: 'Account not found.' });
  if (me.role !== 'Household') return res.status(403).json({ message: 'Household feature' });
  return me;
}

async function listAddresses(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  res.json({ addresses: me.addresses, primary: me.addresses.find((a) => a.isPrimary) || me.addresses[0] || null, address: me.address });
}

async function addAddress(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const { label, address, geoLocation } = req.body;
  if (!address?.trim()) return res.status(400).json({ message: 'Address is required.' });
  const isFirst = me.addresses.length === 0;
  const addr = me.addresses.create({
    label: String(label || (isFirst ? 'Home' : `Address ${me.addresses.length + 1}`)).trim(),
    address: address.trim(),
    geoLocation: (Number.isFinite(Number(geoLocation?.lat)) && Number.isFinite(Number(geoLocation?.lng)))
      ? { lat: Number(geoLocation.lat), lng: Number(geoLocation.lng) }
      : undefined,
    isPrimary: isFirst || !!req.body.isPrimary,
  });
  me.addresses.push(addr);
  // Exactly one primary.
  if (addr.isPrimary) me.addresses.forEach((a) => { if (String(a._id) !== String(addr._id)) a.isPrimary = false; });
  await me.save();
  res.status(201).json({ addresses: me.addresses });
}

async function updateAddress(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const sub = me.addresses.id(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Address not found.' });
  const { label, address, geoLocation, isPrimary } = req.body;
  if (label !== undefined) sub.label = String(label).trim() || sub.label;
  if (address !== undefined && address.trim()) sub.address = address.trim();
  if (geoLocation !== undefined) {
    if (Number.isFinite(Number(geoLocation?.lat)) && Number.isFinite(Number(geoLocation?.lng))) {
      sub.geoLocation = { lat: Number(geoLocation.lat), lng: Number(geoLocation.lng) };
    }
  }
  if (isPrimary === true) me.addresses.forEach((a) => { a.isPrimary = String(a._id) === String(sub._id); });
  await me.save();
  res.json({ addresses: me.addresses });
}

async function deleteAddress(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const sub = me.addresses.id(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Address not found.' });
  const wasPrimary = !!sub.isPrimary;
  sub.deleteOne();
  if (wasPrimary && me.addresses.length) me.addresses[0].isPrimary = true;
  await me.save();
  res.json({ addresses: me.addresses });
}

/* -------------------- Family members -------------------- */

async function listFamily(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  res.json({ familyMembers: me.familyMembers });
}

async function addFamily(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const { name, relation, phone, age } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Member name is required.' });
  me.familyMembers.push({
    name: name.trim(),
    relation: String(relation || 'Family').trim() || 'Family',
    phone: String(phone || '').trim() || undefined,
    age: Number.isFinite(Number(age)) ? Number(age) : undefined,
  });
  await me.save();
  res.status(201).json({ familyMembers: me.familyMembers });
}

async function updateFamily(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const sub = me.familyMembers.id(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Family member not found.' });
  const { name, relation, phone, age } = req.body;
  if (name !== undefined && name.trim()) sub.name = name.trim();
  if (relation !== undefined) sub.relation = String(relation).trim() || sub.relation;
  if (phone !== undefined) sub.phone = String(phone).trim() || undefined;
  if (age !== undefined) sub.age = Number.isFinite(Number(age)) ? Number(age) : undefined;
  await me.save();
  res.json({ familyMembers: me.familyMembers });
}

async function deleteFamily(req, res) {
  const me = await ensureHousehold(req, res);
  if (!me) return;
  const sub = me.familyMembers.id(req.params.id);
  if (!sub) return res.status(404).json({ message: 'Family member not found.' });
  sub.deleteOne();
  await me.save();
  res.json({ familyMembers: me.familyMembers });
}

module.exports = {
  signup, login, me, updateMe,
  sendOtp, resetPassword, changePassword, verifyEmail,
  forgotPasswordInitiate,
  listAddresses, addAddress, updateAddress, deleteAddress,
  listFamily, addFamily, updateFamily, deleteFamily,
};
