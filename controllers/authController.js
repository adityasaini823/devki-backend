import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import * as otpService from '../services/otpService.js';
import logger from '../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const sendLoginOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    
    const user = await User.findOne({ mobile: mobile });
    const result = await otpService.generateAndSendOTP(mobile);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpSent: true,
        userExists: !!user,
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp }),
      });
    }

    return res.status(500).json({
      success: false,
      message: result.message || 'Failed to send OTP',
    });
  } catch (error) {
    logger.error('Send login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


const verifyLoginOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    
    let user;
    try {
      user = await otpService.verifyOTP(mobile, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired OTP',
      });
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'OTP verified. Please complete your profile.',
        needsProfile: true,
        mobile: mobile,
      });
    }

    const isProfileComplete = user.first_name && 
      user.first_name !== 'guest' &&
      user.address && 
      user.city && 
      user.state && 
      user.pincode;

    if (isProfileComplete) {
      const token = jwt.sign(
        { userId: user._id, mobile: user.mobile },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          mobile: user.mobile,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
        },
        needsProfile: false,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Please complete your profile.',
      needsProfile: true,
      mobile: mobile,
    });
  } catch (error) {
    logger.error('Verify login OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const sendSignupOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    const existingUser = await User.findOne({ mobile: mobile });
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
        ...(process.env.NODE_ENV === 'development' && { otp: result.otp }),
      });
    }

    return res.status(500).json({
      success: false,
      message: result.message || 'Failed to send OTP',
    });
  } catch (error) {
    logger.error('Send signup OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const verifySignupOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    try {
      await otpService.verifyOTP(mobile, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired OTP',
      });
    }

    const existingUser = await User.findOne({ mobile: mobile });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this mobile number already exists',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Please complete your profile.',
      needsProfile: true,
      mobile: mobile,
    });
  } catch (error) {
    logger.error('Verify signup OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const completeProfile = async (req, res) => {
  try {
    const { 
      mobile, 
      first_name, 
      last_name, 
      email, 
      address, 
      city, 
      state, 
      pincode 
    } = req.body;

    if (!first_name || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: first_name, address, city, state, pincode',
      });
    }

    let user = await User.findOne({ mobile: mobile });

    if (user) {
      user.first_name = first_name;
      user.last_name = last_name || '';
      user.email = email || '';
      user.address = address;
      user.city = city;
      user.state = state;
      user.pincode = pincode;
      user.updatedAt = Date.now();
      await user.save();
    } else {
      user = await User.create({
        first_name,
        last_name: last_name || '',
        mobile,
        email: email || '',
        address,
        city,
        state,
        pincode,
        country: 'India',
      });
    }

    const token = jwt.sign(
      { userId: user._id, mobile: user.mobile },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token,
      user: {
        id: user._id,
        mobile: user.mobile,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        address: user.address,
        city: user.city,
        state: user.state,
        pincode: user.pincode,
      },
    });
  } catch (error) {
    logger.error('Complete profile error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this mobile number already exists',
      });
    }
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
  completeProfile,
};
