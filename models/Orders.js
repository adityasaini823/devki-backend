import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  product_name: {
    type: String,
    required: true,
  },
  product_price: {
    type: Number,
    required: true,
  },
  product_image: {
    type: String,
    required: false,
  },
  category: {
    type: String,
    required: false,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  total_price: {
    type: Number,
    required: true,
  },
});

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  order_number: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  items: [orderItemSchema],
  total_amount: {
    type: Number,
    required: true,
    min: 0,
  },
  payment_method: {
    type: String,
    required: true,
    enum: ["wallet"],
    default: "wallet",
  },
  payment_status: {
    type: String,
    required: true,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "completed",
  },
  order_status: {
    type: String,
    required: true,
    enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  delivery_address: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: String,
  },
  wallet_transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WalletTransaction",
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

orderSchema.index({ user_id: 1, createdAt: -1 });
orderSchema.index({ order_number: 1 });
orderSchema.index({ order_status: 1 });

export default mongoose.model("Order", orderSchema);

