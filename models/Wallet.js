import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  transaction_type: {
    type: String,
    required: true,
    enum: ["deposit", "withdrawal"],
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ["pending", "completed", "rejected", "cancelled"],
    default: "pending",
  },
  payment_method: {
    type: String,
    required: false,
    enum: ["upi", "card", "netbanking", "wallet", "bank_transfer"],
  },
  payment_id: {
    type: String,
    required: false,
  },
  payment_proof: {
    type: String,
    required: false,
  },
  bank_account: {
    account_number: String,
    ifsc_code: String,
    account_holder_name: String,
  },
  remarks: {
    type: String,
    required: false,
  },
  admin_remarks: {
    type: String,
    required: false,
  },
  processed_at: {
    type: Date,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

walletTransactionSchema.index({ user_id: 1, createdAt: -1 });
walletTransactionSchema.index({ status: 1, transaction_type: 1 });

export default mongoose.model("WalletTransaction", walletTransactionSchema);

