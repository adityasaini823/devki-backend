import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import * as otpService from '../services/otpService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Send OTP for login
const sendLoginOTP = async (req, res) => {
  try {
    const { mobile } = req.body;
    
    // Check if user exists (but don't create yet)
    const user = await User.findOne({ mobile: mobile });
    
    // Generate and send OTP (works for both existing and new users)
    const result = await otpService.generateAndSendOTP(mobile);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otpSent: true,
        userExists: !!user, // Indicate if user already exists
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
    
    // Verify OTP (this will throw error if invalid, or return null if user doesn't exist)
    let user;
    try {
      user = await otpService.verifyOTP(mobile, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired OTP',
      });
    }

    // If user is null, it means OTP is verified but user doesn't exist yet
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'OTP verified. Please complete your profile.',
        needsProfile: true,
        mobile: mobile,
      });
    }

    // Check if user profile is complete
    const isProfileComplete = user.first_name && 
      user.first_name !== 'guest' &&
      user.address && 
      user.city && 
      user.state && 
      user.pincode;

    // If user exists and profile is complete, return token
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

    // If profile is incomplete, indicate profile is needed
    return res.status(200).json({
      success: true,
      message: 'OTP verified. Please complete your profile.',
      needsProfile: true,
      mobile: mobile,
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
    const { mobile, otp } = req.body;

    // Verify OTP (this will throw error if invalid)
    try {
      await otpService.verifyOTP(mobile, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired OTP',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ mobile: mobile });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this mobile number already exists',
      });
    }

    // OTP verified, but user creation will happen in complete-profile endpoint
    return res.status(200).json({
      success: true,
      message: 'OTP verified. Please complete your profile.',
      needsProfile: true,
      mobile: mobile,
    });
  } catch (error) {
    console.error('Verify signup OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// Complete profile for new users or update incomplete profiles
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

    // Validate required fields
    if (!first_name || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: first_name, address, city, state, pincode',
      });
    }

    // Check if user exists
    let user = await User.findOne({ mobile: mobile });

    if (user) {
      // Update existing user profile
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
      // Create new user
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

    // Generate JWT token
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
    console.error('Complete profile error:', error);
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
