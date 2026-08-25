const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Cooperative = require('../models/Cooperative');
const Provider = require('../models/Provider');
const { signToken } = require('../utils/helpers');

async function signup(req, res) {
  const {
    name, phone, email, password, role, address, geoLocation,
    cooperativeId, cooperative,
  } = req.body;

  if (!['Household', 'Provider', 'Cooperative Admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (await User.findOne({ email })) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, phone, email, passwordHash, role, address, geoLocation });

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
    user: { id: user._id, name: user.name, role: user.role, email: user.email },
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = signToken(user);
  res.json({ token, user: { id: user._id, name: user.name, role: user.role, email: user.email } });
}

async function me(req, res) {
  const user = await User.findById(req.user.userId).select('-passwordHash');
  res.json(user);
}

module.exports = { signup, login, me };
