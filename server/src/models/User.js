const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home' },
    address: { type: String, required: true },
    geoLocation: { lat: Number, lng: Number },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const familyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relation: { type: String, default: 'Family' },
    phone: { type: String },
    age: { type: Number },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Household', 'Provider', 'Cooperative Admin', 'Federation Admin'],
      required: true,
    },
    avatarUrl: { type: String, default: '' },
    bio: { type: String, default: '' },
    designation: { type: String, default: '' },
    location: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata (IST)' },
    language: { type: String, default: 'English' },
    contactPreference: { type: String, default: 'Email' },
    address: { type: String },
    geoLocation: { lat: Number, lng: Number },
    emailVerified: { type: Boolean, default: false },
    // Bookmarked gig-worker providers (Household portal "Saved Providers").
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Provider' }],
    // Household wallet (prepaid credits used to pay bookings instantly).
    walletBalance: { type: Number, default: 0 },
    // Per-channel notification preferences (defaults: everything on).
    notificationPrefs: {
      type: Object,
      default: { inApp: true, email: true, promotional: true },
    },
    // Real household profile details (persisted — no demo values).
    emergencyContact: { name: String, phone: String },
    householdSize: { type: Number },
    specialInstructions: { type: String },
    prefLang: { type: String },
    // Saved address book (home, office, society, …) with a primary address.
    addresses: [addressSchema],
    // Members of the household living under one account.
    familyMembers: [familyMemberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);