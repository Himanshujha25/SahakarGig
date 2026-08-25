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
    geoLocation: { lat: Number, lng: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Provider', providerSchema);
