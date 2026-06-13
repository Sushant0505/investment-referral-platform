/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verify JWT token
 */
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Protect route middleware
 * Verifies JWT token and attaches user to request
 */
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please provide a valid JWT token.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyJWT(token);

    // Check if token is blacklisted (optional - for logout functionality)
    // const isBlacklisted = await TokenBlacklist.findOne({ token });
    // if (isBlacklisted) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Token has been revoked',
    //   });
    // }

    // Fetch user
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}. Please contact support.`,
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(403).json({
        success: false,
        message: 'Account is locked due to multiple failed login attempts. Try again later.',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.token = token;

    logger.debug(`User authenticated: ${user.email}`);
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);

    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please refresh your token.',
        errorCode: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed',
    });
  }
};

/**
 * Optional auth middleware
 * Attaches user if token is valid, but doesn't fail if token is missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyJWT(token);

      const user = await User.findById(decoded.userId).select('-password');
      if (user && user.accountStatus === 'active') {
        req.user = user;
        req.userId = user._id;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    logger.debug(`Optional auth skipped: ${error.message}`);
    next();
  }
};

/**
 * Require verified email
 */
const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
    });
  }

  next();
};

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  protect,
  optionalAuth,
  requireVerifiedEmail,
  generateTokens,
  verifyJWT,
  verifyRefreshToken,
};
