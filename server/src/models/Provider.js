const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', required: true },
    skills: [String],
    hourlyRate: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    availabilitySlots: [{ day: String, from: String, to: String }],
    documents: [String],
    avatar: { type: String, default: "" },
    geoLocation: { lat: Number, lng: Number },
    trustScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

providerSchema.index({ cooperativeId: 1, verified: 1 });
providerSchema.index({ cooperativeId: 1, trustScore: -1 });
providerSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Provider', providerSchema);
