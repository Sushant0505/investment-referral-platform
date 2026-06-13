/**
 * User Schema
 * Stores user account information, wallet balance, and referral data
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },

    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits'],
      unique: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },

    referralCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: function () {
        return crypto
          .randomBytes(6)
          .toString('hex')
          .toUpperCase();
      },
    },

    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
    },

    totalROIEarned: {
      type: Number,
      default: 0,
      min: [0, 'Total ROI cannot be negative'],
    },

    totalLevelIncomeEarned: {
      type: Number,
      default: 0,
      min: [0, 'Total level income cannot be negative'],
    },

    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'banned'],
      default: 'active',
      index: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },

    documentUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * INDEXES
 * Optimize database queries
 */
userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ referredBy: 1 });
userSchema.index({ accountStatus: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.compound_index = [{ referredBy: 1, createdAt: -1 }]; // For fetching referrals

/**
 * VIRTUALS
 */
userSchema.virtual('referralLink').get(function () {
  return `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${this.referralCode}`;
});

/**
 * HOOKS - Pre-save middleware
 */
// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * METHODS
 */
// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // Reset login attempts if lock period has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 30 minutes
  const maxAttempts = 5;
  const lockTimeMinutes = 30;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + lockTimeMinutes * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

// Get public user data (without sensitive info)
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationToken;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

/**
 * STATICS
 */
// Find by referral code
userSchema.statics.findByReferralCode = function (code) {
  return this.findOne({ referralCode: code });
};

// Get user statistics
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$accountStatus', 'active'] }, 1, 0] },
        },
        totalWalletBalance: { $sum: '$walletBalance' },
        totalROIEarned: { $sum: '$totalROIEarned' },
        totalLevelIncomeEarned: { $sum: '$totalLevelIncomeEarned' },
      },
    },
  ]);

  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    totalWalletBalance: 0,
    totalROIEarned: 0,
    totalLevelIncomeEarned: 0,
  };
};

module.exports = mongoose.model('User', userSchema);