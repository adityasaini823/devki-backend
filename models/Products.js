import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        index: true,
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
        required: true,
    },
    product_stock: {
        type: Number,
        required: true,
        default: 0,
    },
});

const Product = mongoose.model('Product', productSchema);

export default Product;