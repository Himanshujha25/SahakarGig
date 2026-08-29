const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
    skills: [String],
    hourlyRate: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 're_verification_requested'],
      default: 'pending',
    },
    reVerificationReason: { type: String, default: '' },
    availabilitySlots: [{ day: String, from: String, to: String }],
    documents: [String],
    documentDetails: [
      {
        docType: { type: String }, // 'Aadhaar Card', 'PAN Card', 'Skill Certificate', 'Trade License', 'e-Shram Card'
        docNumber: { type: String },
        docUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
        status: { type: String, default: 'pending' },
      },
    ],
    avatar: { type: String, default: '' },
    geoLocation: { lat: Number, lng: Number },
    trustScore: { type: Number, default: 0 },
    verificationHistory: [
      {
        action: { type: String }, // 'Approved', 'Rejected', 'Re-verification Requested'
        date: { type: Date, default: Date.now },
        adminName: { type: String },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

providerSchema.index({ cooperativeId: 1, verified: 1 });
providerSchema.index({ cooperativeId: 1, trustScore: -1 });
providerSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Provider', providerSchema);
