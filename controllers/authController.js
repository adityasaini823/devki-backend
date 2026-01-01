import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as otpService from '../services/otpService.js';
import logger from '../logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '-refresh';

// Helper function to generate refresh token
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Helper function to generate access and refresh tokens
const generateTokens = (userId, mobile) => {
  const accessToken = jwt.sign(
    { userId, mobile },
    JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );
  
  const refreshToken = generateRefreshToken();
  
  return { accessToken, refreshToken };
};

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

    // Clear OTP fields after successful verification
    user.otp = undefined;
    user.otp_expiresAt = undefined;
    await user.save();

    const isProfileComplete = user.first_name && 
      user.first_name !== 'guest' &&
      user.address && 
      user.city && 
      user.state && 
      user.pincode;

    if (isProfileComplete) {
      const { accessToken, refreshToken } = generateTokens(user._id, user.mobile);

      // Store refresh token in database (OTP already cleared after verification)
      user.refresh_token = refreshToken;
      user.refreshToken_createdAt = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: accessToken,
        refreshToken,
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

    const { accessToken, refreshToken } = generateTokens(user._id, user.mobile);

    // Clear OTP fields and store refresh token
    user.otp = undefined;
    user.otp_expiresAt = undefined;
    user.refresh_token = refreshToken;
    user.refreshToken_createdAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      token: accessToken,
      refreshToken,
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

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    // Find user with this refresh token
    const user = await User.findOne({ refresh_token: token });

    if (!user) {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Check if refresh token is expired (30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (!user.refreshToken_createdAt || user.refreshToken_createdAt < thirtyDaysAgo) {
      // Clear expired refresh token
      user.refresh_token = undefined;
      user.refreshToken_createdAt = undefined;
      await user.save();

      return res.status(403).json({
        success: false,
        message: 'Refresh token has expired',
      });
    }

    // Generate new access token
    const { accessToken } = generateTokens(user._id, user.mobile);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: accessToken,
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { first_name, last_name, email, address, city, state, pincode } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields if provided
    if (first_name !== undefined) {
      if (!first_name || first_name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'First name must be at least 2 characters long',
        });
      }
      user.first_name = first_name.trim();
    }

    if (last_name !== undefined) {
      user.last_name = last_name ? last_name.trim() : '';
    }

    if (email !== undefined) {
      // Basic email validation
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
      user.email = email ? email.trim() : '';
    }

    if (address !== undefined) {
      if (!address || address.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Address must be at least 5 characters long',
        });
      }
      user.address = address.trim();
    }

    if (city !== undefined) {
      if (!city || city.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'City must be at least 2 characters long',
        });
      }
      user.city = city.trim();
    }

    if (state !== undefined) {
      if (!state || state.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'State must be at least 2 characters long',
        });
      }
      user.state = state.trim();
    }

    if (pincode !== undefined) {
      if (!pincode || !/^\d{6}$/.test(pincode)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 6-digit pincode',
        });
      }
      user.pincode = pincode.trim();
    }

    user.updatedAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('-otp -otp_expiresAt -refresh_token -refreshToken_createdAt -__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
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
        country: user.country,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const logout = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (user) {
          // Clear refresh token
          user.refresh_token = undefined;
          user.refreshToken_createdAt = undefined;
          await user.save();
        }
      } catch (error) {
        // Token might be expired, but we still want to allow logout
        logger.debug('Token verification failed during logout:', error.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
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
  refreshToken,
  updateProfile,
  getProfile,
  logout,
};
