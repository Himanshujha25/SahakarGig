const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Null while a broadcast job is awaiting first-acceptance; set on assignment
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
    cooperativeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cooperative', default: null },
    service: { type: String, required: true },
    scheduledTime: { type: Date },

    // ── AI Geospatial Broadcast & First-Acceptance Dispatch §3.1 ──
    dispatchMode: { type: String, enum: ['direct', 'broadcast'], default: 'direct' },
    broadcastStatus: {
      type: String,
      enum: ['broadcasting', 'assigned', 'expired', 'cancelled'],
      default: 'broadcasting',
    },
    targetCategory: { type: String }, // e.g. 'Electrician'
    locationText: { type: String },   // e.g. 'Delhi, Indiranagar'
    coordinates: {
      lat: { type: Number, default: 28.6139 },
      lng: { type: Number, default: 77.2090 },
    },
    claimedAt: { type: Date },
    // Broadcast offers expire unless the household keeps them alive from the radar page
    expiresAt: { type: Date },

    status: {
      type: String,
      enum: ['requested', 'accepted', 'in-progress', 'completed', 'cancelled', 'disputed'],
      default: 'requested',
    },
    price: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    isEmergency: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    issue: { type: String },
    disputeCategory: { type: String },   // reason category chosen by the household
    disputeEvidence: [String],           // evidence document URLs/keys uploaded by the household
    cancelReason: { type: String },
    chat: [{ sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, message: String, at: { type: Date, default: Date.now } }],
    // Recurring bookings (same provider, same service, auto re-booked).
    recurrence: {
      enabled: { type: Boolean, default: false },
      freq: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'none'], default: 'none' },
      repeats: { type: Number, default: 1 },   // total occurrences including this one
      nextRunAt: { type: Date },
      seriesId: { type: String },              // shared across the whole series
    },
    // Group / community booking (e.g. entire building society).
    groupBooking: {
      enabled: { type: Boolean, default: false },
      groupName: { type: String },
      memberCount: { type: Number, default: 1 },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ householdId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ cooperativeId: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
