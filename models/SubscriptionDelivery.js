import mongoose from "mongoose";

const subscriptionDeliverySchema = new mongoose.Schema({
    subscription_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        required: true,
        index: true,
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    scheduled_date: {
        type: Date,
        required: true,
        index: true,
    },
    delivery_time: {
        type: String,
        required: true,
    },
    product_quantity: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'scheduled',
        enum: ['scheduled', 'delivered', 'skipped', 'missed'],
        index: true,
    },
    payment_status: {
        type: String,
        required: true,
        default: 'pending',
        enum: ['pending', 'deducted', 'not_applicable'],
    },
    delivered_at: {
        type: Date,
        default: null,
    },
    skipped_by: {
        type: String,
        enum: ['user', 'admin', null],
        default: null,
    },
    notes: {
        type: String,
        default: '',
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

// Compound indexes for common queries
subscriptionDeliverySchema.index({ user_id: 1, scheduled_date: 1 });
subscriptionDeliverySchema.index({ scheduled_date: 1, status: 1 });
subscriptionDeliverySchema.index({ subscription_id: 1, scheduled_date: 1 });

// Pre-save middleware to update timestamps
subscriptionDeliverySchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export default mongoose.model('SubscriptionDelivery', subscriptionDeliverySchema);
