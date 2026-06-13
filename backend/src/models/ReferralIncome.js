/**
 * Referral Income Schema
 * Tracks income from referral hierarchy (MLM structure)
 * Level 1 = 10%, Level 2 = 5%, Level 3 = 3%, Level 4 = 2%, Level 5 = 1%
 */

const mongoose = require('mongoose');

const referralIncomeSchema = new mongoose.Schema(
  {
    receiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver User ID is required'],
      index: true,
    },

    sourceUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Source User ID is required'],
      index: true,
    },

    level: {
      type: Number,
      required: [true, 'Level is required'],
      enum: [1, 2, 3, 4, 5],
      index: true,
    },

    incomeAmount: {
      type: Number,
      required: [true, 'Income amount is required'],
      min: [0, 'Income amount cannot be negative'],
    },

    incomePercentage: {
      type: Number,
      required: [true, 'Income percentage is required'],
      enum: [10, 5, 3, 2, 1],
    },

    investmentAmount: {
      type: Number,
      required: [true, 'Investment amount is required'],
    },

    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: true,
      index: true,
    },

    creditDate: {
      type: Date,
      required: [true, 'Credit date is required'],
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'credited', 'failed', 'reversed'],
      default: 'pending',
      index: true,
    },

    processedAt: {
      type: Date,
      default: null,
    },

    transactionId: {
      type: String,
      unique: true,
      sparse: true,
    },

    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },

    // Track the full referral path for audit
    referralPath: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        level: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * INDEXES
 */
referralIncomeSchema.index({ receiverUserId: 1, status: 1 });
referralIncomeSchema.index({ sourceUserId: 1 });
referralIncomeSchema.index({ level: 1 });
referralIncomeSchema.index({ creditDate: -1 });
referralIncomeSchema.index({ status: 1 });
referralIncomeSchema.index({ createdAt: -1 });
// Compound index for monthly summaries
referralIncomeSchema.index({ receiverUserId: 1, creditDate: -1 });
// Compound index for level income tracking
referralIncomeSchema.index({ receiverUserId: 1, level: 1 });

/**
 * METHODS
 */
// Mark as credited
referralIncomeSchema.methods.markAsCredited = async function () {
  this.status = 'credited';
  this.processedAt = new Date();
  return this.save();
};

// Mark as failed
referralIncomeSchema.methods.markAsFailed = async function (reason) {
  this.status = 'failed';
  this.remarks = reason;
  this.processedAt = new Date();
  return this.save();
};

// Reverse income
referralIncomeSchema.methods.reverse = async function (reason) {
  this.status = 'reversed';
  this.remarks = reason;
  return this.save();
};

/**
 * STATICS
 */
// Get level income structure
referralIncomeSchema.statics.getLevelIncomePercentage = function (level) {
  const levelPercentages = {
    1: 10,
    2: 5,
    3: 3,
    4: 2,
    5: 1,
  };
  return levelPercentages[level] || 0;
};

// Find referral income for a user
referralIncomeSchema.statics.findUserReferralIncome = function (userId, status = 'credited') {
  return this.find({
    receiverUserId: userId,
    status,
  })
    .populate('sourceUserId', 'fullName email')
    .sort({ creditDate: -1 });
};

// Get user referral income summary
referralIncomeSchema.statics.getUserReferralSummary = async function (userId) {
  const summary = await this.aggregate([
    {
      $match: {
        receiverUserId: new mongoose.Types.ObjectId(userId),
        status: 'credited',
      },
    },
    {
      $group: {
        _id: null,
        totalReferralIncome: { $sum: '$incomeAmount' },
        totalRecords: { $sum: 1 },
        byLevel: {
          $push: {
            level: '$level',
            amount: '$incomeAmount',
            percentage: '$incomePercentage',
          },
        },
      },
    },
  ]);

  if (summary.length > 0) {
    const levelSummary = {};
    for (let level = 1; level <= 5; level++) {
      const levelData = summary[0].byLevel.filter((item) => item.level === level);
      levelSummary[`level${level}`] = {
        count: levelData.length,
        totalIncome: levelData.reduce((sum, item) => sum + item.amount, 0),
      };
    }

    return {
      totalReferralIncome: summary[0].totalReferralIncome,
      totalRecords: summary[0].totalRecords,
      byLevel: levelSummary,
    };
  }

  return {
    totalReferralIncome: 0,
    totalRecords: 0,
    byLevel: {
      level1: { count: 0, totalIncome: 0 },
      level2: { count: 0, totalIncome: 0 },
      level3: { count: 0, totalIncome: 0 },
      level4: { count: 0, totalIncome: 0 },
      level5: { count: 0, totalIncome: 0 },
    },
  };
};

// Get monthly referral income summary
referralIncomeSchema.statics.getMonthlyReferralSummary = async function (userId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        receiverUserId: new mongoose.Types.ObjectId(userId),
        creditDate: { $gte: startDate, $lte: endDate },
        status: 'credited',
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$creditDate' } },
        dailyIncome: { $sum: '$incomeAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Get downline referrals (direct and indirect) for a user
referralIncomeSchema.statics.getDownlineIncome = async function (userId) {
  return this.aggregate([
    {
      $match: {
        receiverUserId: new mongoose.Types.ObjectId(userId),
        status: 'credited',
      },
    },
    {
      $group: {
        _id: '$level',
        count: { $sum: 1 },
        totalIncome: { $sum: '$incomeAmount' },
        avgIncome: { $avg: '$incomeAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

module.exports = mongoose.model('ReferralIncome', referralIncomeSchema);