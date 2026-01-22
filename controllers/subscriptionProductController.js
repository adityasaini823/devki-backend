import SubscriptionProduct from '../models/SubscriptionProducts.js';
import logger from '../logger.js';

// Get all active subscription products
const getSubscriptionProducts = async (req, res) => {
  try {
    const products = await SubscriptionProduct.find({ is_active: true })
      .sort({ quantity: 1 })
      .select('-__v');

    // Transform products to include id field
    const transformedProducts = products.map(product => ({
      id: product._id.toString(),
      quantity: product.quantity,
      name: product.name,
      price_per_unit: product.price_per_unit,
      price_per_delivery: product.price_per_delivery,
      image: product.image,
      description: product.description,
      is_active: product.is_active,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      products: transformedProducts,
    });
  } catch (error) {
    logger.error('Get subscription products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get single subscription product by ID
const getSubscriptionProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await SubscriptionProduct.findById(id).select('-__v');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Subscription product not found',
      });
    }

    return res.status(200).json({
      success: true,
      product: {
        id: product._id.toString(),
        quantity: product.quantity,
        name: product.name,
        price_per_unit: product.price_per_unit,
        price_per_delivery: product.price_per_delivery,
        image: product.image,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get subscription product by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create subscription product (admin only - can add auth later)
const createSubscriptionProduct = async (req, res) => {
  try {
    const { quantity, name, price_per_unit, price_per_delivery, image, description } = req.body;

    if (!quantity || !name || price_per_unit === undefined || price_per_delivery === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide quantity, name, price_per_unit, and price_per_delivery',
      });
    }

    // Check if product with this quantity already exists
    const existingProduct = await SubscriptionProduct.findOne({ quantity });
    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: 'Subscription product with this quantity already exists',
      });
    }

    const product = await SubscriptionProduct.create({
      quantity,
      name,
      price_per_unit,
      price_per_delivery,
      image: image || '',
      description: description || '',
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription product created successfully',
      product: {
        id: product._id,
        quantity: product.quantity,
        name: product.name,
        price_per_unit: product.price_per_unit,
        price_per_delivery: product.price_per_delivery,
        image: product.image,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Create subscription product error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Subscription product with this quantity already exists',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update subscription product (admin only)
const updateSubscriptionProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price_per_unit, price_per_delivery, image, description, is_active } = req.body;

    const product = await SubscriptionProduct.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Subscription product not found',
      });
    }

    if (name !== undefined) product.name = name;
    if (price_per_unit !== undefined) product.price_per_unit = price_per_unit;
    if (price_per_delivery !== undefined) product.price_per_delivery = price_per_delivery;
    if (image !== undefined) product.image = image;
    if (description !== undefined) product.description = description;
    if (is_active !== undefined) product.is_active = is_active;
    product.updatedAt = new Date();

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription product updated successfully',
      product: {
        id: product._id,
        quantity: product.quantity,
        name: product.name,
        price_per_unit: product.price_per_unit,
        price_per_delivery: product.price_per_delivery,
        image: product.image,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update subscription product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete subscription product (soft delete)
const deleteSubscriptionProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await SubscriptionProduct.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Subscription product not found',
      });
    }

    product.is_active = false;
    product.updatedAt = new Date();
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription product deleted successfully',
    });
  } catch (error) {
    logger.error('Delete subscription product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  getSubscriptionProducts,
  getSubscriptionProductById,
  createSubscriptionProduct,
  updateSubscriptionProduct,
  deleteSubscriptionProduct,
};

