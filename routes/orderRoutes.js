import express from 'express';
import {
  checkout,
  getUserOrders,
  getOrderById,
} from '../controllers/orderController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticateToken);

// Checkout - Create order from cart
router.post('/checkout', checkout);

// Get user's orders
router.get('/', getUserOrders);

// Get single order by ID
router.get('/:id', getOrderById);

export default router;

