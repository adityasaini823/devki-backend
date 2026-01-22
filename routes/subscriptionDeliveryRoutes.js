import express from 'express';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import {
    getUserDeliveries,
    skipDelivery,
    getDeliveriesByDate,
    markDelivered,
    adminSkipDelivery,
    markMissed,
    generateDeliveries,
} from '../controllers/subscriptionDeliveryController.js';

const router = express.Router();

// ===== USER ROUTES =====
// Get user's upcoming/past deliveries
router.get('/my-deliveries', authenticateToken, getUserDeliveries);

// Skip a delivery (user)
router.patch('/:id/skip', authenticateToken, skipDelivery);

// ===== ADMIN ROUTES =====
// Generate deliveries for all active subscriptions
router.post('/generate', authenticateToken, isAdmin, generateDeliveries);

// Get deliveries by date (for today's delivery view)
router.get('/by-date', authenticateToken, isAdmin, getDeliveriesByDate);

// Mark delivery as delivered (deducts wallet)
router.patch('/:id/deliver', authenticateToken, isAdmin, markDelivered);

// Skip delivery (admin)
router.patch('/:id/admin-skip', authenticateToken, isAdmin, adminSkipDelivery);

// Mark delivery as missed
router.patch('/:id/missed', authenticateToken, isAdmin, markMissed);

export default router;
