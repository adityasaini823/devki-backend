import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Public route to get settings
router.get('/', getSettings);

// Admin only route to update settings
router.put('/', authenticateAdmin, updateSettings);

export default router;
