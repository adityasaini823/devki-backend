import express from 'express';
import {
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
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Public routes (no auth required)
router.post('/login', adminLogin);
router.post('/refresh', refreshAdminToken);
router.post('/logout', adminLogout);

// All routes below require admin authentication
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Orders
router.get('/orders', getAllOrders);
router.patch('/orders/:id/status', updateOrderStatus);

// Products
router.get('/products', getAllProducts);

// Subscriptions
router.get('/subscriptions', getAllSubscriptions);
router.patch('/subscriptions/:id/status', updateSubscriptionStatus);

// Subscription Products
router.get('/subscription-products', getAllSubscriptionProducts);

// Wallet Transactions
router.get('/wallet-transactions', getAllWalletTransactions);
router.patch('/wallet-transactions/:id/status', updateWalletTransactionStatus);

export default router;
