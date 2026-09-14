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
    disputeResolution: {
      decision: {
        type: String,
        enum: ['refund_household', 'release_provider', 'penalty_provider', 'warning', 'escalated', 'none'],
        default: 'none',
      },
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: { type: Date },
      notes: { type: String },
      refundAmount: { type: Number, default: 0 },
      penaltyAmount: { type: Number, default: 0 },
      status: { type: String, enum: ['open', 'investigating', 'resolved', 'escalated'], default: 'open' },
    },
    // Before-work verification (Worker uploads on site before starting)
    startWorkProof: {
      photo: { type: String },
      description: { type: String },
      startedAt: { type: Date },
    },
    // After-work verification (Worker uploads upon completing repair)
    completionProof: {
      photo: { type: String },
      description: { type: String },
      completedAt: { type: Date },
    },
    // Completion OTP (Generated on household side when worker marks in-progress)
    completionOtp: { type: String },
    otpVerified: { type: Boolean, default: false },

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
    // Institutional Bulk RFP / Cooperative Multi-Worker Dispatch
    bulkDetails: {
      isBulk: { type: Boolean, default: false },
      rolesNeeded: [
        {
          role: { type: String, required: true },
          count: { type: Number, required: true, default: 1 },
          dailyRate: { type: Number, default: 0 },
        },
      ],
      durationDays: { type: Number, default: 1 },
      startDate: { type: Date },
      siteLocation: { type: String },
      scopeOfWork: { type: String },
      quotation: {
        status: { type: String, enum: ['pending', 'sent', 'accepted', 'rejected'], default: 'pending' },
        totalAmount: { type: Number, default: 0 },
        breakdown: [
          {
            role: { type: String },
            count: { type: Number },
            dailyRate: { type: Number },
            total: { type: Number },
          },
        ],
        notes: { type: String },
        sentAt: { type: Date },
        acceptedAt: { type: Date },
      },
      allocations: [
        {
          role: { type: String },
          providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
          status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
          rejectionReason: { type: String },
          allocatedAt: { type: Date, default: Date.now },
          respondedAt: { type: Date },
          payoutStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
          payoutProofUrl: { type: String },
          payoutAmount: { type: Number, default: 0 },
          payoutTxnRef: { type: String },
          paidAt: { type: Date },
        },
      ],
      householdPaymentProof: {
        ssUrl: { type: String },
        amount: { type: Number, default: 0 },
        txnRef: { type: String },
        uploadedAt: { type: Date },
        verifiedByCoop: { type: Boolean, default: false },
        verifiedAt: { type: Date },
      },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ householdId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ cooperativeId: 1, status: 1 });
bookingSchema.index({ cooperativeId: 1, createdAt: -1 });
bookingSchema.index({ 'bulkDetails.isBulk': 1, createdAt: -1 });
bookingSchema.index({ 'bulkDetails.allocations.providerId': 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
