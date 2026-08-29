const mongoose = require('mongoose');

// Recurring service plans a household can subscribe to (wallet auto-renewed).
const subscriptionSchema = new mongoose.Schema(
  {
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['basic', 'pro', 'premium'], required: true },
    monthlyPrice: { type: Number, required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
    startedAt: { type: Date, default: Date.now },
    renewsAt: { type: Date },
  },
  { timestamps: true }
);

subscriptionSchema.index({ householdId: 1, status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);