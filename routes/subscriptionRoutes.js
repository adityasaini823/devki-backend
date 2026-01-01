import express from 'express';
import {
  createOrUpdateSubscription,
  getSubscription,
  pauseSubscription,
  cancelSubscription,
} from '../controllers/subscriptionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All subscription routes require authentication
router.use(authenticateToken);

// Create or update subscription
router.post('/', createOrUpdateSubscription);

// Get user's subscription
router.get('/', getSubscription);

// Pause subscription
router.patch('/pause', pauseSubscription);

// Cancel subscription
router.patch('/cancel', cancelSubscription);

export default router;

