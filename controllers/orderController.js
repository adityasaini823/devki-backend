import Order from '../models/Orders.js';
import CartItem from '../models/Cart.js';
import User from '../models/User.js';
import WalletTransaction from '../models/Wallet.js';
import logger from '../logger.js';

// Generate unique order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
};

// Checkout - Create order from cart
export const checkout = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    // Get user with address details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get all cart items for the user
    const cartItems = await CartItem.find({ user_id: userId });

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty. Add items to cart before checkout.',
      });
    }

    // Calculate total amount
    const totalAmount = cartItems.reduce((sum, item) => sum + item.total_price, 0);

    // Check wallet balance
    const walletBalance = user.wallet_balance || 0;
    if (walletBalance < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance',
        required_amount: totalAmount,
        current_balance: walletBalance,
        shortfall: totalAmount - walletBalance,
      });
    }

    // Create order items from cart items
    const orderItems = cartItems.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_price: item.product_price,
      product_image: item.product_image,
      category: item.category,
      quantity: item.quantity,
      total_price: item.total_price,
    }));

    // Create wallet transaction for the purchase
    const walletTransaction = new WalletTransaction({
      user_id: userId,
      transaction_type: 'withdrawal',
      amount: totalAmount,
      status: 'completed',
      payment_method: 'wallet',
      remarks: 'Order purchase',
      processed_at: new Date(),
    });
    await walletTransaction.save();

    // Deduct amount from wallet
    user.wallet_balance = walletBalance - totalAmount;
    await user.save();

    // Create order
    const order = new Order({
      user_id: userId,
      order_number: generateOrderNumber(),
      items: orderItems,
      total_amount: totalAmount,
      payment_method: 'wallet',
      payment_status: 'completed',
      order_status: 'confirmed',
      delivery_address: {
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        country: user.country || 'India',
      },
      wallet_transaction_id: walletTransaction._id,
    });
    await order.save();

    // Clear cart after successful order
    await CartItem.deleteMany({ user_id: userId });

    logger.info(`Order created: ${order.order_number} for user ${userId}, amount: ₹${totalAmount}`);

    return res.status(200).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        order: {
          id: order._id.toString(),
          order_number: order.order_number,
          total_amount: order.total_amount,
          order_status: order.order_status,
          payment_status: order.payment_status,
          items: order.items,
          delivery_address: order.delivery_address,
          createdAt: order.createdAt,
        },
        new_wallet_balance: user.wallet_balance,
      },
    });
  } catch (error) {
    logger.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get user's orders
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 20, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const query = { user_id: userId };
    if (status && ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.order_status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Order.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: {
        orders: orders.map((order) => ({
          id: order._id.toString(),
          order_number: order.order_number,
          items: order.items,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_status: order.order_status,
          delivery_address: order.delivery_address,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Get user orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: user not found in request',
      });
    }

    const order = await Order.findOne({ _id: id, user_id: userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        order: {
          id: order._id.toString(),
          order_number: order.order_number,
          items: order.items,
          total_amount: order.total_amount,
          payment_method: order.payment_method,
          payment_status: order.payment_status,
          order_status: order.order_status,
          delivery_address: order.delivery_address,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

