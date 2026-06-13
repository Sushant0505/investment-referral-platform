/**
 * Transaction Schema
 * Maintains audit trail of all wallet operations
 * Tracks deposits, withdrawals, ROI credits, and referral income
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    transactionType: {
      type: String,
      enum: [
        'roi_credit',
        'referral_income',
        'investment',
        'withdrawal',
        'deposit',
        'refund',
        'adjustment',
      ],
      required: [true, 'Transaction type is required'],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    balanceBefore: {
      type: Number,
      default: 0,
    },

    balanceAfter: {
      type: Number,
      default: 0,
    },

    source: {
      type: String,
      enum: [
        'system',
        'admin',
        'user',
        'cron_job',
        'api',
        'referral_system',
      ],
      default: 'system',
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'reversed'],
      default: 'completed',
      index: true,
    },

    relatedDocuments: {
      investmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment',
        default: null,
      },
      roiHistoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ROIHistory',
        default: null,
      },
      referralIncomeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReferralIncome',
        default: null,
      },
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    processedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * INDEXES
 */
transactionSchema.index({ userId: 1, transactionType: 1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionType: 1, status: 1 });
transactionSchema.index({ processedAt: -1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
// Compound index for audit queries
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });

/**
 * METHODS
 */
// Mark transaction as completed
transactionSchema.methods.markAsCompleted = async function () {
  this.status = 'completed';
  this.processedAt = new Date();
  return this.save();
};

// Mark transaction as failed
transactionSchema.methods.markAsFailed = async function (reason) {
  this.status = 'failed';
  this.remarks = reason;
  this.processedAt = new Date();
  return this.save();
};

// Reverse transaction
transactionSchema.methods.reverse = async function (reason, balanceBefore, balanceAfter) {
  this.status = 'reversed';
  this.remarks = reason;
  this.balanceBefore = balanceBefore;
  this.balanceAfter = balanceAfter;
  return this.save();
};

// Get transaction summary
transactionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    type: this.transactionType,
    amount: this.amount,
    status: this.status,
    description: this.description,
    date: this.processedAt,
  };
};

/**
 * STATICS
 */
// Get user transaction history
transactionSchema.statics.getUserTransactions = function (userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ processedAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'fullName email');
};

// Get transactions by type
transactionSchema.statics.getTransactionsByType = function (userId, type, limit = 50) {
  return this.find({
    userId,
    transactionType: type,
  })
    .sort({ processedAt: -1 })
    .limit(limit);
};

// Get wallet summary
transactionSchema.statics.getWalletSummary = async function (userId) {
  const summary = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: '$transactionType',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {};
  summary.forEach((item) => {
    result[item._id] = {
      amount: item.totalAmount,
      count: item.count,
    };
  });

  return result;
};

// Get daily transaction summary
transactionSchema.statics.getDailyTransactionSummary = async function (userId, date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        processedAt: { $gte: startDate, $lte: endDate },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$transactionType',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// Get monthly transaction summary
transactionSchema.statics.getMonthlyTransactionSummary = async function (userId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        processedAt: { $gte: startDate, $lte: endDate },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$processedAt' } },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Create transaction log
transactionSchema.statics.createTransaction = async function (
  userId,
  type,
  amount,
  balanceBefore,
  balanceAfter,
  description,
  source = 'system',
  relatedDocuments = {}
) {
  try {
    const transaction = await this.create({
      userId,
      transactionType: type,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      source,
      relatedDocuments,
      status: 'completed',
    });

    return transaction;
  } catch (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }
};

module.exports = mongoose.model('Transaction', transactionSchema);