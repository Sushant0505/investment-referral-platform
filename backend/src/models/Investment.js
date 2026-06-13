/**
 * Investment Schema
 * Stores investment information and tracks ROI distribution
 */

const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    investmentAmount: {
      type: Number,
      required: [true, 'Investment amount is required'],
      min: [100, 'Minimum investment is 100'],
      max: [10000000, 'Maximum investment is 10000000'],
    },

    planName: {
      type: String,
      enum: ['basic', 'standard', 'premium', 'elite'],
      required: [true, 'Plan name is required'],
      index: true,
    },

    dailyROIPercentage: {
      type: Number,
      required: [true, 'Daily ROI percentage is required'],
      min: [0.1, 'Daily ROI must be at least 0.1%'],
      max: [5, 'Daily ROI cannot exceed 5%'],
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now,
      index: true,
    },

    endDate: {
      type: Date,
      // required: [true, 'End date is required'],
    },

    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },

    totalROIGenerated: {
      type: Number,
      default: 0,
      min: [0, 'Total ROI cannot be negative'],
    },

    lastROIDate: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },

    roiProcessed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * INDEXES
 */
investmentSchema.index({ userId: 1, status: 1 });
investmentSchema.index({ investmentId: 1, createdAt: -1 });
investmentSchema.index({ status: 1 });
investmentSchema.index({ createdAt: -1 });
investmentSchema.index({ startDate: 1, endDate: 1 });
// Compound index for efficient ROI queries
investmentSchema.index({ userId: 1, status: 1, endDate: 1 });

/**
 * VIRTUALS
 */
investmentSchema.virtual('daysActive').get(function () {
  const end = this.status === 'completed' ? this.endDate : new Date();
  const days = Math.floor((end - this.startDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
});

investmentSchema.virtual('expectedROI').get(function () {
  if (this.status === 'cancelled') return 0;
  const daysActive = Math.floor((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  return (this.investmentAmount * this.dailyROIPercentage * daysActive) / 100;
});

investmentSchema.virtual('remainingDays').get(function () {
  if (this.status !== 'active') return 0;
  const today = new Date();
  if (today >= this.endDate) return 0;
  return Math.ceil((this.endDate - today) / (1000 * 60 * 60 * 24));
});

/**
 * HOOKS
 */
// Update end date based on plan
investmentSchema.pre('save', function (next) {
  if (!this.endDate) {
    const planDurations = {
      basic: 30,
      standard: 60,
      premium: 90,
      elite: 180,
    };

    const durationDays = planDurations[this.planName] || 30;
    const endDate = new Date(this.startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    this.endDate = endDate;
  }

  // Check if investment period has ended
  if (this.status === 'active' && new Date() >= this.endDate) {
    this.status = 'completed';
  }

  next();
});

/**
 * METHODS
 */
// Calculate daily ROI for a specific date
investmentSchema.methods.calculateDailyROI = function () {
  if (this.status !== 'active') {
    return 0;
  }

  // Check if investment period has ended
  if (new Date() >= this.endDate) {
    return 0;
  }

  const dailyROI = (this.investmentAmount * this.dailyROIPercentage) / 100;
  return Math.round(dailyROI * 100) / 100; // Round to 2 decimal places
};

// Check if ROI should be credited today
investmentSchema.methods.shouldCreditROI = function (specificDate = null) {
  const today = specificDate || new Date();
  today.setHours(0, 0, 0, 0);

  if (this.status !== 'active') {
    return false;
  }

  if (today >= this.endDate) {
    return false;
  }

  if (this.lastROIDate) {
    const lastDate = new Date(this.lastROIDate);
    lastDate.setHours(0, 0, 0, 0);
    return lastDate.getTime() !== today.getTime();
  }

  return true;
};

// Get investment duration in days
investmentSchema.methods.getDuration = function () {
  return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
};

// Mark investment as completed
investmentSchema.methods.complete = async function () {
  this.status = 'completed';
  this.lastROIDate = new Date();
  return this.save();
};

/**
 * STATICS
 */
// Find all active investments
investmentSchema.statics.findActiveInvestments = function () {
  return this.find({
    status: 'active',
    endDate: { $gt: new Date() },
  }).populate('userId', 'fullName email walletBalance');
};

// Find user's active investments
investmentSchema.statics.findUserActiveInvestments = function (userId) {
  return this.find({
    userId,
    status: 'active',
    endDate: { $gt: new Date() },
  });
};

// Get user investment summary
investmentSchema.statics.getUserInvestmentSummary = async function (userId) {
  const summary = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalInvested: { $sum: '$investmentAmount' },
        totalROIGenerated: { $sum: '$totalROIGenerated' },
        activeCount: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        completedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
        },
      },
    },
  ]);

  return summary[0] || {
    totalInvested: 0,
    totalROIGenerated: 0,
    activeCount: 0,
    completedCount: 0,
    cancelledCount: 0,
  };
};

module.exports = mongoose.model('Investment', investmentSchema);