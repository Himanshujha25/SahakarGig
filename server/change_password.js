require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function main() {
  const email = process.argv[2] || 'coder268@gmail.com';
  const rawPassword = process.argv[3] || '123456789';

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sahakargig';
  console.log('[Script] Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('[Script] Connected to MongoDB.');

  const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  if (existingUser) {
    existingUser.passwordHash = passwordHash;
    await existingUser.save();
    console.log(`[Success] Password successfully updated for existing user: ${existingUser.name} (${existingUser.email})`);
  } else {
    console.log(`[Info] User with email ${email} not found. Creating new user account...`);
    const newUser = await User.create({
      name: 'Coder 268',
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'Household',
      phone: '9876543210',
      address: 'Default Address',
    });
    console.log(`[Success] Created new user account for ${newUser.email} with role '${newUser.role}' and password set.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('[Error]', err);
  process.exit(1);
});
