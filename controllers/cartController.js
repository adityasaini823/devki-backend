import CartItem from '../models/Cart.js';
import Product from '../models/Products.js';
import logger from '../logger.js';

// Helper to calculate total price
const calculateTotalPrice = (unitPrice, quantity) => {
  return unitPrice * quantity;
};

// Get current user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const items = await CartItem.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    const transformedItems = items.map((item) => ({
      id: item._id.toString(),
      product_id: item.product_id.toString(),
      product_name: item.product_name,
      product_price: item.product_price,
      product_image: item.product_image,
      category: item.category,
      quantity: item.quantity,
      total_price: item.total_price,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    const cartTotal = transformedItems.reduce(
      (sum, item) => sum + item.total_price,
      0
    );

    return res.status(200).json({
      success: true,
      items: transformedItems,
      count: transformedItems.length,
      cartTotal,
    });
  } catch (error) {
    logger.error('Get cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Add item to cart or update quantity if it already exists
const addOrUpdateCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { product_id, quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: 'product_id is required',
      });
    }

    const qty = quantity && Number(quantity) > 0 ? Number(quantity) : 1;

    // Fetch product
    const product = await Product.findById(product_id);
    if (!product || !product.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or inactive',
      });
    }

    const unitPrice = product.product_price;
    const totalPrice = calculateTotalPrice(unitPrice, qty);

    // Find existing cart item for this user & product
    let cartItem = await CartItem.findOne({
      user_id: userId,
      product_id: product._id,
    });

    if (cartItem) {
      // Update quantity
      cartItem.quantity = qty;
      cartItem.product_name = product.product_name;
      cartItem.product_price = unitPrice;
      cartItem.product_image = product.product_image;
      cartItem.category = product.category;
      cartItem.total_price = totalPrice;
      cartItem.updatedAt = new Date();
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        user_id: userId,
        product_id: product._id,
        product_name: product.product_name,
        product_price: unitPrice,
        product_image: product.product_image,
        category: product.category,
        quantity: qty,
        total_price: totalPrice,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cart updated successfully',
      item: {
        id: cartItem._id.toString(),
        product_id: cartItem.product_id.toString(),
        product_name: cartItem.product_name,
        product_price: cartItem.product_price,
        product_image: cartItem.product_image,
        category: cartItem.category,
        quantity: cartItem.quantity,
        total_price: cartItem.total_price,
        createdAt: cartItem.createdAt,
        updatedAt: cartItem.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Add/Update cart item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update quantity for a specific cart item (by cart item ID)
const updateCartItemQuantity = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const qty = quantity && Number(quantity) > 0 ? Number(quantity) : 1;

    const cartItem = await CartItem.findOne({
      _id: id,
      user_id: userId,
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    cartItem.quantity = qty;
    cartItem.total_price = calculateTotalPrice(
      cartItem.product_price,
      cartItem.quantity
    );
    cartItem.updatedAt = new Date();
    await cartItem.save();

    return res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      item: {
        id: cartItem._id.toString(),
        product_id: cartItem.product_id.toString(),
        product_name: cartItem.product_name,
        product_price: cartItem.product_price,
        product_image: cartItem.product_image,
        category: cartItem.category,
        quantity: cartItem.quantity,
        total_price: cartItem.total_price,
        createdAt: cartItem.createdAt,
        updatedAt: cartItem.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Update cart item quantity error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Remove a single cart item
const removeCartItem = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const item = await CartItem.findOneAndDelete({
      _id: id,
      user_id: userId,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Cart item removed successfully',
    });
  } catch (error) {
    logger.error('Remove cart item error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Clear entire cart for current user
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    await CartItem.deleteMany({ user_id: userId });

    return res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
    });
  } catch (error) {
    logger.error('Clear cart error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  getCart,
  addOrUpdateCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
};


