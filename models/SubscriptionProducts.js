import mongoose from "mongoose";

const subscriptionProductSchema = new mongoose.Schema({
    id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
});

const SubscriptionProduct = mongoose.model('SubscriptionProduct', subscriptionProductSchema);

export default SubscriptionProduct;