import express from 'express';
import {
  getCart,
  addOrUpdateCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from '../controllers/cartController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticateToken);

// Get current user's cart
router.get('/', getCart);

// Add item to cart or update if exists
router.post('/', addOrUpdateCartItem);

// Update quantity for specific cart item
router.patch('/:id', updateCartItemQuantity);

// Remove specific cart item
router.delete('/:id', removeCartItem);

// Clear entire cart
router.delete('/', clearCart);

export default router;


