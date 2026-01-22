import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    subscription_product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubscriptionProduct',
        required: true,
        index: true,
    },
    delivery_time: {
        type: String,
        required: true,
    },
    frequency: {
        type: String,
        required: true,
        enum: ['daily', 'weekdays', 'weekly', 'biweekly'],
    },
    deliveries_per_month: {
        type: Number,
        required: true,
    },
    price_per_delivery: {
        type: Number,
        required: true,
    },
    monthly_estimate: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'active',
        enum: ['active', 'paused', 'cancelled'],
    },
    start_date: {
        type: Date,
        default: Date.now,
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

subscriptionSchema.index({ user_id: 1, status: 1 });
subscriptionSchema.index({ subscription_product_id: 1 });

export default mongoose.model('Subscription', subscriptionSchema);