/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Register new user
   */
  static async register(userData) {
    try {
      const { fullName, email, mobileNumber, password, referralCode } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { mobileNumber }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error('Email already registered');
        }
        throw new Error('Mobile number already registered');
      }

      // Validate referral code if provided
      let referredBy = null;
      if (referralCode) {
        const referrer = await User.findByReferralCode(referralCode);

        if (!referrer) {
          throw new Error('Invalid referral code');
        }

        if (referrer.accountStatus !== 'active') {
          throw new Error('Referrer account is not active');
        }

        referredBy = referrer._id;
      }

      // Create new user
      const newUser = new User({
        fullName,
        email,
        mobileNumber,
        password,
        referredBy,
      });

      await newUser.save();

      logger.info(`User registered: ${email}`);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(newUser._id);

      return {
        success: true,
        user: newUser.toPublicJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check account status
      if (user.accountStatus !== 'active') {
        throw new Error(`Account is ${user.accountStatus}`);
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw new Error('Account is locked. Please try again later.');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment login attempts
        await user.incLoginAttempts();
        throw new Error('Invalid email or password');
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${email}`);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      return {
        success: true,
        user: user.toPublicJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Get user
      const user = await User.findById(decoded.userId);

      if (!user || user.accountStatus !== 'active') {
        throw new Error('Invalid refresh token or user not found');
      }

      // Generate new tokens
      const tokens = generateTokens(user._id);

      logger.debug(`Access token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -emailVerificationToken -passwordResetToken')
        .lean();

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user,
      };
    } catch (error) {
      logger.error(`Get profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId, updates) {
    try {
      const allowedUpdates = ['fullName', 'mobileNumber'];

      // Filter allowed updates
      const updateData = {};
      allowedUpdates.forEach((field) => {
        if (updates[field]) {
          updateData[field] = updates[field];
        }
      });

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`User profile updated: ${user.email}`);

      return {
        success: true,
        user: user.toPublicJSON(),
      };
    } catch (error) {
      logger.error(`Update profile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');

      if (!user) {
        throw new Error('User not found');
      }

      // Verify old password
      const isPasswordValid = await user.comparePassword(oldPassword);

      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      return {
        success: true,
        message: 'Password updated successfully',
      };
    } catch (error) {
      logger.error(`Change password error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify email (for future implementation)
   */
  static async verifyEmail(userId, token) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.emailVerificationToken !== token) {
        throw new Error('Invalid verification token');
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      logger.error(`Email verification error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Request password reset (for future implementation)
   */
  static async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: 'If user exists, password reset link has been sent',
        };
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      await user.save();

      logger.info(`Password reset requested for user: ${email}`);

      // TODO: Send reset email
      // await EmailService.sendPasswordResetEmail(email, resetToken);

      return {
        success: true,
        message: 'Password reset link has been sent to your email',
      };
    } catch (error) {
      logger.error(`Password reset request error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(resetToken, newPassword) {
    try {
      const user = await User.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select('+password');

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for user: ${user.email}`);

      return {
        success: true,
        message: 'Password updated successfully',
      };
    } catch (error) {
      logger.error(`Password reset error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AuthService;
