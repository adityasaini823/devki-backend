import Product from '../models/Products.js';
import logger from '../logger.js';

// Get all active products
const getProducts = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = { is_active: true };

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Search by product name if provided
    if (search) {
      query.product_name = { $regex: search, $options: 'i' };
    }

    const products = await Product.aggregate([
      { $match: query },
      {
        $addFields: {
          isInStock: { $gt: ["$product_stock", 0] }
        }
      },
      { $sort: { isInStock: -1, createdAt: -1 } }
    ]);

    // Transform products to include id field
    const transformedProducts = products.map(product => ({
      id: product._id.toString(),
      product_name: product.product_name,
      product_price: product.product_price,
      product_image: product.product_image,
      product_stock: product.product_stock,
      category: product.category,
      description: product.description,
      is_active: product.is_active,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      products: transformedProducts,
      count: transformedProducts.length,
    });
  } catch (error) {
    logger.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).select('-__v');

    if (!product || !product.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      success: true,
      product: {
        id: product._id.toString(),
        product_name: product.product_name,
        product_price: product.product_price,
        product_image: product.product_image,
        product_stock: product.product_stock,
        category: product.category,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get product by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Create product (admin only - can add auth later)
const createProduct = async (req, res) => {
  try {
    const { product_name, product_price, product_image, product_stock, category, description } = req.body;

    if (!product_name || product_price === undefined || !product_image || product_stock === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide product_name, product_price, product_image, and product_stock',
      });
    }

    const product = await Product.create({
      product_name,
      product_price,
      product_image,
      product_stock,
      category: category || '',
      description: description || '',
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: {
        id: product._id.toString(),
        product_name: product.product_name,
        product_price: product.product_price,
        product_image: product.product_image,
        product_stock: product.product_stock,
        category: product.category,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Create product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update product (admin only)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_name, product_price, product_image, product_stock, category, description, is_active } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (product_name !== undefined) product.product_name = product_name;
    if (product_price !== undefined) product.product_price = product_price;
    if (product_image !== undefined) product.product_image = product_image;
    if (product_stock !== undefined) product.product_stock = product_stock;
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (is_active !== undefined) product.is_active = is_active;
    product.updatedAt = new Date();

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: {
        id: product._id.toString(),
        product_name: product.product_name,
        product_price: product.product_price,
        product_image: product.product_image,
        product_stock: product.product_stock,
        category: product.category,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete product (admin only - soft delete by setting is_active to false)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    product.is_active = false;
    product.updatedAt = new Date();
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

