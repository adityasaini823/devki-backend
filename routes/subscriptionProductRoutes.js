import express from 'express';
import {
  getSubscriptionProducts,
  getSubscriptionProductById,
  createSubscriptionProduct,
  updateSubscriptionProduct,
} from '../controllers/subscriptionProductController.js';
// Note: Add admin auth middleware later for create/update routes

import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Get all active subscription products (public)
router.get('/', getSubscriptionProducts);

// Get single subscription product (public)
router.get('/:id', getSubscriptionProductById);

// Protected admin routes
router.use(authenticateAdmin);

// Create subscription product
router.post('/', createSubscriptionProduct);

// Update subscription product
router.patch('/:id', updateSubscriptionProduct);

export default router;

