const express = require('express');
const router = express.Router();
const {
  sendLoginOTP,
  verifyLoginOTP,
  sendSignupOTP,
  verifySignupOTP,
} = require('../controllers/authController');
const {
  validateSendLoginOTP,
  validateVerifyLoginOTP,
  validateSendSignupOTP,
  validateVerifySignupOTP,
} = require('../utils/validators');

// Login OTP flow
router.post('/send-login-otp', validateSendLoginOTP, sendLoginOTP);
router.post('/verify-login-otp', validateVerifyLoginOTP, verifyLoginOTP);

// Signup OTP flow
router.post('/send-signup-otp', validateSendSignupOTP, sendSignupOTP);
router.post('/verify-signup-otp', validateVerifySignupOTP, verifySignupOTP);

module.exports = router;

