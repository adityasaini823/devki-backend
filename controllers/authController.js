import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import * as otpService from '../services/otpService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Send OTP for login
const sendLoginOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    let user = User.findByMobile(mobile);
    
    if (!user) {
      try {
        user = User.create("User", mobile);
      } catch (error) {
        user = User.findByMobile(mobile);
        if (!user) {
          throw error;
        }
      }
    }

    // Generate and send OTP
    const result = await otpService.generateAndSendOTP(mobile);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpSent: true,
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp }),
      });
    }

    return res.status(500).json({
      success: false,
      message: result.message || 'Failed to send OTP',
    });
  } catch (error) {
    console.error('Send login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


const verifyLoginOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    // Verify OTP
    const otpResult = otpService.verifyOTP(mobile, otp);
    
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    // Find user
    const user = User.findByMobile(mobile);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, mobile: user.mobile },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Verify login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Send OTP for signup
const sendSignupOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    // Check if user already exists
    const existingUser = User.findByMobile(mobile);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this mobile number already exists',
      });
    }

    // Generate and send OTP
    const result = await otpService.generateAndSendOTP(mobile);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpSent: true,
        // In development, include OTP in response for testing
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp }),
      });
    }

    return res.status(500).json({
      success: false,
      message: result.message || 'Failed to send OTP',
    });
  } catch (error) {
    console.error('Send signup OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Verify OTP and signup
const verifySignupOTP = async (req, res) => {
  try {
    const { name, mobile, otp } = req.body;

    // Verify OTP
    const otpResult = otpService.verifyOTP(mobile, otp);
    
    if (!otpResult.valid) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    // Create user
    try {
      const user = User.create(name, mobile);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, mobile: user.mobile },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'User created successfully',
        token,
        user: user.toJSON(),
      });
    } catch (error) {
      if (error.message === 'User already exists') {
        return res.status(409).json({
          success: false,
          message: 'User with this mobile number already exists',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export {
  sendLoginOTP,
  verifyLoginOTP,
  sendSignupOTP,
  verifySignupOTP,
};
