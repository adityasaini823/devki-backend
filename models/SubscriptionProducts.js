import mongoose from "mongoose";

const subscriptionProductSchema = new mongoose.Schema({
    quantity: {
        type: String, // '1L', '2L', '3L', '5L'
        required: true,
        unique: true,
        enum: ['1L', '2L', '3L', '5L'],
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    price_per_unit: {
        type: Number, // Price per liter
        required: true,
    },
    price_per_delivery: {
        type: Number, // Calculated price for this quantity
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
    is_active: {
        type: Boolean,
        default: true,
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

subscriptionProductSchema.index({ quantity: 1, is_active: 1 });

export default mongoose.model('SubscriptionProduct', subscriptionProductSchema);