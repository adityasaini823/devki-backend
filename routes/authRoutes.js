import express from 'express';
import {
  sendLoginOTP,
  verifyLoginOTP,
  sendSignupOTP,
  verifySignupOTP,
} from '../controllers/authController.js';
import {
  validateSendLoginOTP,
  validateVerifyLoginOTP,
  validateSendSignupOTP,
  validateVerifySignupOTP,
} from '../utils/validators.js';

const router = express.Router();

// Login OTP flow
router.post('/send-login-otp', validateSendLoginOTP, sendLoginOTP);
router.post('/verify-login-otp', validateVerifyLoginOTP, verifyLoginOTP);

// Signup OTP flow
router.post('/send-signup-otp', validateSendSignupOTP, sendSignupOTP);
router.post('/verify-signup-otp', validateVerifySignupOTP, verifySignupOTP);

export default router;

