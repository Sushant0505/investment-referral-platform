/**
 * Authentication Controller
 * Handles user registration, login, and profile management
 */

const { asyncHandler, throwError } = require('../middleware/errorHandler');
const AuthService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * POST /api/auth/register
 * Register new user
 */
const register = asyncHandler(async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, referralCode } = req.body;

    const result = await AuthService.register({
      fullName,
      email,
      mobileNumber,
      password,
      referralCode,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);

    if (error.message.includes('already')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        errorCode: 'DUPLICATE_ENTRY',
      });
    }

    throwError(error.message, 400);
  }
});

/**
 * POST /api/auth/login
 * User login
 */
const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login(email, password);

    // Set refresh token in httpOnly cookie (optional)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);

    const statusCode = error.message.includes('locked') ? 403 : 401;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      errorCode: 'INVALID_CREDENTIALS',
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
const refreshToken = asyncHandler(async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throwError('Refresh token is required', 400);
    }

    const tokens = await AuthService.refreshAccessToken(token);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens,
      },
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    res.status(401).json({
      success: false,
      message: error.message,
      errorCode: 'INVALID_REFRESH_TOKEN',
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user profile
 */
const getProfile = asyncHandler(async (req, res) => {
  try {
    const result = await AuthService.getProfile(req.userId);

    res.status(200).json({
      success: true,
      data: result.user,
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    throwError(error.message, 404);
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  try {
    const result = await AuthService.updateProfile(req.userId, req.body);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: result.user,
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const result = await AuthService.changePassword(req.userId, oldPassword, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);

    const statusCode = error.message.includes('incorrect') ? 401 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    const result = await AuthService.requestPasswordReset(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
const resetPassword = asyncHandler(async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    const result = await AuthService.resetPassword(resetToken, newPassword);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);

    const statusCode = error.message.includes('expired') ? 400 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
const logout = asyncHandler(async (req, res) => {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Optional: Implement token blacklist for logout
    // const TokenBlacklist = require('../models/TokenBlacklist');
    // await TokenBlacklist.create({ token: req.token });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    throwError(error.message, 400);
  }
});

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
};
