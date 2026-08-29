const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    payoutId: { type: String, required: true, unique: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    providerName: { type: String, required: true },
    providerEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },
    bankAccountOrUpi: { type: String, required: true },
    transactionRef: { type: String, required: true },
    cooperativeStampId: { type: String },
    status: { type: String, enum: ["Completed", "Processing", "Failed"], default: "Completed" },
    receiptSentToEmail: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payout", payoutSchema);
