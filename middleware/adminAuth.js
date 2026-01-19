// Admin authentication middleware
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      // Verify user exists and is admin
      const user = await User.findById(decoded.userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      req.admin = {
        userId: decoded.userId,
        email: user.email,
        role: user.role,
      };
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export { authenticateAdmin };
