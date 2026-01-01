import express from 'express';
import {
  sendLoginOTP,
  verifyLoginOTP,
  sendSignupOTP,
  verifySignupOTP,
  completeProfile,
  refreshToken,
  updateProfile,
  getProfile,
  logout,
} from '../controllers/authController.js';
import {
  validateSendLoginOTP,
  validateVerifyLoginOTP,
  validateSendSignupOTP,
  validateVerifySignupOTP,
  validateCompleteProfile,
} from '../utils/validators.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login OTP flow
router.post('/send-login-otp', validateSendLoginOTP, sendLoginOTP);
router.post('/verify-login-otp', validateVerifyLoginOTP, verifyLoginOTP);

// Signup OTP flow
router.post('/signup', validateSendSignupOTP, sendSignupOTP);
router.post('/verify-signup-otp', validateVerifySignupOTP, verifySignupOTP);

// Complete profile (for new users or incomplete profiles)
router.post('/complete-profile', validateCompleteProfile, completeProfile);

// Token management
router.post('/refresh-token', refreshToken);

// Profile management (authenticated)
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);

// Logout
router.post('/logout', authenticateToken, logout);

export default router;

