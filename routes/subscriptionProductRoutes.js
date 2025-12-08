import express from 'express';
import {
  getSubscriptionProducts,
  getSubscriptionProductById,
  createSubscriptionProduct,
  updateSubscriptionProduct,
} from '../controllers/subscriptionProductController.js';
// Note: Add admin auth middleware later for create/update routes

const router = express.Router();

// Get all active subscription products (public)
router.get('/', getSubscriptionProducts);

// Get single subscription product (public)
router.get('/:id', getSubscriptionProductById);

// Create subscription product (admin - add auth later)
router.post('/', createSubscriptionProduct);

// Update subscription product (admin - add auth later)
router.patch('/:id', updateSubscriptionProduct);

export default router;

