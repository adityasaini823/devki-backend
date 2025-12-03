import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    subscription_product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionProduct',
        required: true,
    },
    start_date: {
        type: Date,
        required: true,
    },
    end_date: {
        type: Date,
        required: true,
    },
    frequency: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'active',
    },
    unit_price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);