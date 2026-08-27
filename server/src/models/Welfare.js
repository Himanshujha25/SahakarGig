const mongoose = require('mongoose');

const welfareSchema = new mongoose.Schema(
  {
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true, unique: true },
    eShramId: { type: String },
    // unregistered | self_declared | govt_verified
    eShramVerificationStatus: { type: String, enum: ['unregistered', 'self_declared', 'govt_verified'], default: 'unregistered' },
    eShramVerifiedAt: { type: Date },
    eShramVerifiedName: { type: String },   // name as returned by mock/govt lookup
    eShramDob: { type: String },
    eShramState: { type: String },
    insuranceOptIn: { type: Boolean, default: false },
    insuranceProvider: { type: String },
    schemesEligible: [String],
    totalEarnings: { type: Number, default: 0 },
    daysWorked: { type: Number, default: 0 },
    welfareScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Welfare', welfareSchema);
