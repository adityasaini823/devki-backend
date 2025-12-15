import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    product_name: {
        type: String,
        required: true,
        index: true,
    },
    product_price: {
        type: Number,
        required: true,
    },
    product_image: {
        type: String,
        required: true,
    },
    product_stock: {
        type: Number,
        required: true,
        default: 0,
    },
    category: {
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

productSchema.index({ product_name: 1, is_active: 1 });

export default mongoose.model('Product', productSchema);