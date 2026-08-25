const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Household', 'Provider', 'Cooperative Admin'],
      required: true,
    },
    address: { type: String },
    geoLocation: { lat: Number, lng: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
