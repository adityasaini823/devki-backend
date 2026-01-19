import User from '../models/User.js';
import Product from '../models/Products.js';
import Order from '../models/Orders.js';
import Subscription from '../models/Subscription.js';
import WalletTransaction from '../models/Wallet.js';
import SubscriptionProduct from '../models/SubscriptionProducts.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import logger from '../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '-admin-refresh';

// Cookie options for refresh token
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

// Generate access token (short-lived, stored in memory)
const generateAccessToken = (admin) => {
  return jwt.sign(
    { userId: admin._id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes
  );
};

// Generate refresh token (long-lived, stored in HTTP-only cookie)
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const admin = await User.findOne({ email, role: 'admin' });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password is set (for new admin setup)
    if (!admin.password) {
      if (password === 'Admin@123') {
        const hashedPassword = await bcrypt.hash(password, 10);
        admin.password = hashedPassword;
        await admin.save();
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }
    } else {
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken();

    // Store refresh token in database
    admin.refresh_token = refreshToken;
    admin.refreshToken_createdAt = new Date();
    await admin.save();

    // Set refresh token in HTTP-only cookie
    res.cookie('adminRefreshToken', refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken, // Access token returned in response body (stored in memory)
      admin: {
        id: admin._id,
        email: admin.email,
        first_name: admin.first_name,
        role: admin.role,
      },
    });
  } catch (error) {
    logger.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Refresh access token using HTTP-only cookie
const refreshAdminToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    // Find admin with this refresh token
    const admin = await User.findOne({ refresh_token: refreshToken, role: 'admin' });

    if (!admin) {
      // Clear invalid cookie
      res.clearCookie('adminRefreshToken', { path: '/' });
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Check if refresh token is expired (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (!admin.refreshToken_createdAt || admin.refreshToken_createdAt < sevenDaysAgo) {
      // Clear expired refresh token
      admin.refresh_token = undefined;
      admin.refreshToken_createdAt = undefined;
      await admin.save();
      res.clearCookie('adminRefreshToken', { path: '/' });

      return res.status(403).json({
        success: false,
        message: 'Refresh token expired',
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(admin);

    // Optionally rotate refresh token for extra security
    const newRefreshToken = generateRefreshToken();
    admin.refresh_token = newRefreshToken;
    admin.refreshToken_createdAt = new Date();
    await admin.save();

    // Set new refresh token in cookie
    res.cookie('adminRefreshToken', newRefreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      accessToken,
      admin: {
        id: admin._id,
        email: admin.email,
        first_name: admin.first_name,
        role: admin.role,
      },
    });
  } catch (error) {
    logger.error('Refresh admin token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Admin logout - clear cookies and invalidate refresh token
const adminLogout = async (req, res) => {
  try {
    const refreshToken = req.cookies.adminRefreshToken;

    if (refreshToken) {
      // Invalidate refresh token in database
      const admin = await User.findOne({ refresh_token: refreshToken, role: 'admin' });
      if (admin) {
        admin.refresh_token = undefined;
        admin.refreshToken_createdAt = undefined;
        await admin.save();
      }
    }

    // Clear the cookie
    res.clearCookie('adminRefreshToken', { path: '/' });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Admin logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalSubscriptions,
      totalRevenue,
      pendingWalletTransactions,
      recentOrders,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Product.countDocuments({ is_active: true }),
      Subscription.countDocuments({ status: 'active' }),
      Order.aggregate([
        { $match: { payment_status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
      WalletTransaction.countDocuments({ status: 'pending' }),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user_id', 'first_name last_name mobile')
        .select('order_number total_amount order_status payment_status createdAt'),
    ]);

    const revenue = totalRevenue[0]?.total || 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalSubscriptions,
        totalRevenue: revenue,
        pendingWalletTransactions,
        recentOrders: recentOrders.map(order => ({
          id: order._id,
          order_number: order.order_number,
          user_name: order.user_id ? `${order.user_id.first_name} ${order.user_id.last_name || ''}`.trim() : 'N/A',
          total_amount: order.total_amount,
          order_status: order.order_status,
          payment_status: order.payment_status,
          createdAt: order.createdAt,
        })),
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { role: 'user' };
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-otp -otp_expiresAt -refresh_token -refreshToken_createdAt -password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        email: user.email,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        wallet_balance: user.wallet_balance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-otp -otp_expiresAt -refresh_token -refreshToken_createdAt -password');

    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        email: user.email,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        wallet_balance: user.wallet_balance,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, address, city, state, pincode, wallet_balance } = req.body;

    const user = await User.findById(id);
    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (first_name !== undefined) user.first_name = first_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (email !== undefined) user.email = email;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (pincode !== undefined) user.pincode = pincode;
    if (wallet_balance !== undefined) user.wallet_balance = wallet_balance;
    user.updatedAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        email: user.email,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
        wallet_balance: user.wallet_balance,
      },
    });
  } catch (error) {
    logger.error('Update user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user || user.role === 'admin') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all orders
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, payment_status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.order_status = status;
    if (payment_status) query.payment_status = payment_status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user_id', 'first_name last_name mobile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      orders: orders.map(order => ({
        id: order._id,
        order_number: order.order_number,
        user: order.user_id ? {
          id: order.user_id._id,
          name: `${order.user_id.first_name} ${order.user_id.last_name || ''}`.trim(),
          mobile: order.user_id.mobile,
        } : null,
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
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, payment_status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order_status) {
      if (!['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(order_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid order status',
        });
      }
      order.order_status = order_status;
    }

    if (payment_status) {
      if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment status',
        });
      }
      order.payment_status = payment_status;
    }

    order.updatedAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: {
        id: order._id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
      },
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all products (admin view - includes inactive)
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, is_active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query.product_name = { $regex: search, $options: 'i' };
    }
    if (category) query.category = category;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      products: products.map(product => ({
        id: product._id,
        product_name: product.product_name,
        product_price: product.product_price,
        product_image: product.product_image,
        product_stock: product.product_stock,
        category: product.category,
        description: product.description,
        is_active: product.is_active,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('user_id', 'first_name last_name mobile')
        .populate('subscription_product_id')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Subscription.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        user: sub.user_id ? {
          id: sub.user_id._id,
          name: `${sub.user_id.first_name} ${sub.user_id.last_name || ''}`.trim(),
          mobile: sub.user_id.mobile,
        } : null,
        product: sub.subscription_product_id,
        delivery_time: sub.delivery_time,
        frequency: sub.frequency,
        deliveries_per_month: sub.deliveries_per_month,
        price_per_delivery: sub.price_per_delivery,
        monthly_estimate: sub.monthly_estimate,
        status: sub.status,
        start_date: sub.start_date,
        createdAt: sub.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all subscriptions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update subscription status
const updateSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription status',
      });
    }

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    subscription.status = status;
    subscription.updatedAt = new Date();
    await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: {
        id: subscription._id,
        status: subscription.status,
      },
    });
  } catch (error) {
    logger.error('Update subscription status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all subscription products
const getAllSubscriptionProducts = async (req, res) => {
  try {
    const subscriptionProducts = await SubscriptionProduct.find()
      .sort({ quantity: 1 });

    return res.status(200).json({
      success: true,
      subscriptionProducts: subscriptionProducts.map(sp => ({
        id: sp._id,
        quantity: sp.quantity,
        name: sp.name,
        price_per_unit: sp.price_per_unit,
        price_per_delivery: sp.price_per_delivery,
        image: sp.image,
        description: sp.description,
        is_active: sp.is_active,
        createdAt: sp.createdAt,
        updatedAt: sp.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Get all subscription products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Get all wallet transactions
const getAllWalletTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, transaction_type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (status) query.status = status;
    if (transaction_type) query.transaction_type = transaction_type;

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .populate('user_id', 'first_name last_name mobile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      WalletTransaction.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      transactions: transactions.map(txn => ({
        id: txn._id,
        user: txn.user_id ? {
          id: txn.user_id._id,
          name: `${txn.user_id.first_name} ${txn.user_id.last_name || ''}`.trim(),
          mobile: txn.user_id.mobile,
        } : null,
        transaction_type: txn.transaction_type,
        amount: txn.amount,
        status: txn.status,
        payment_method: txn.payment_method,
        payment_id: txn.payment_id,
        bank_account: txn.bank_account,
        remarks: txn.remarks,
        admin_remarks: txn.admin_remarks,
        processed_at: txn.processed_at,
        createdAt: txn.createdAt,
        updatedAt: txn.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get all wallet transactions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Update wallet transaction status
const updateWalletTransactionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_remarks } = req.body;

    if (!['pending', 'completed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction status',
      });
    }

    const transaction = await WalletTransaction.findById(id).populate('user_id');
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const oldStatus = transaction.status;
    transaction.status = status;
    if (admin_remarks !== undefined) transaction.admin_remarks = admin_remarks;
    
    if (status === 'completed' && oldStatus !== 'completed') {
      transaction.processed_at = new Date();
      
      // Update user wallet balance for completed deposits
      if (transaction.transaction_type === 'deposit' && transaction.user_id) {
        transaction.user_id.wallet_balance = (transaction.user_id.wallet_balance || 0) + transaction.amount;
        await transaction.user_id.save();
      }
    }
    
    if (status === 'rejected' && oldStatus === 'completed' && transaction.transaction_type === 'deposit') {
      // Refund if rejecting a completed deposit
      if (transaction.user_id) {
        transaction.user_id.wallet_balance = Math.max(0, (transaction.user_id.wallet_balance || 0) - transaction.amount);
        await transaction.user_id.save();
      }
    }

    transaction.updatedAt = new Date();
    await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: {
        id: transaction._id,
        status: transaction.status,
        admin_remarks: transaction.admin_remarks,
      },
    });
  } catch (error) {
    logger.error('Update wallet transaction status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  adminLogin,
  refreshAdminToken,
  adminLogout,
  getDashboardStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllOrders,
  updateOrderStatus,
  getAllProducts,
  getAllSubscriptions,
  updateSubscriptionStatus,
  getAllSubscriptionProducts,
  getAllWalletTransactions,
  updateWalletTransactionStatus,
};
