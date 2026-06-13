/**
 * ROI History Schema
 * Tracks daily ROI credits from investments
 */

const mongoose = require('mongoose');

const roiHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    investmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: [true, 'Investment ID is required'],
      index: true,
    },

    roiAmount: {
      type: Number,
      required: [true, 'ROI amount is required'],
      min: [0, 'ROI amount cannot be negative'],
    },

    roiPercentage: {
      type: Number,
      required: [true, 'ROI percentage is required'],
      min: [0, 'ROI percentage cannot be negative'],
      max: [100, 'ROI percentage cannot exceed 100'],
    },

    investmentAmount: {
      type: Number,
      required: [true, 'Investment amount is required'],
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

    failureReason: {
      type: String,
      default: null,
    },

    remarks: {
      type: String,
      maxlength: [500, 'Remarks cannot exceed 500 characters'],
    },

    cronJobId: {
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
 * Compound index for idempotency check
 */
roiHistorySchema.index({ userId: 1, investmentId: 1, creditDate: 1 }, { unique: true });
roiHistorySchema.index({ userId: 1, status: 1 });
roiHistorySchema.index({ investmentId: 1 });
roiHistorySchema.index({ creditDate: -1 });
roiHistorySchema.index({ status: 1 });
roiHistorySchema.index({ createdAt: -1 });
// Compound index for monthly/daily summaries
roiHistorySchema.index({ userId: 1, creditDate: -1 });

/**
 * HOOKS
 */
// Pre-save validation
roiHistorySchema.pre('save', async function (next) {
  // Check if ROI for this investment on this date already exists
  if (this.isNew) {
    const existing = await mongoose.model('ROIHistory').findOne({
      userId: this.userId,
      investmentId: this.investmentId,
      creditDate: {
        $gte: new Date(this.creditDate).setHours(0, 0, 0, 0),
        $lt: new Date(this.creditDate).setHours(23, 59, 59, 999),
      },
    });

    if (existing && this.status === 'credited') {
      throw new Error('ROI already credited for this investment on this date');
    }
  }

  next();
});

/**
 * METHODS
 */
// Mark as credited
roiHistorySchema.methods.markAsCredited = async function () {
  this.status = 'credited';
  this.processedAt = new Date();
  return this.save();
};

// Mark as failed
roiHistorySchema.methods.markAsFailed = async function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

// Reverse ROI credit
roiHistorySchema.methods.reverse = async function (reason) {
  this.status = 'reversed';
  this.remarks = reason;
  return this.save();
};

/**
 * STATICS
 */
// Find ROI history for a user on a specific date
roiHistorySchema.statics.findByDateRange = function (userId, startDate, endDate) {
  return this.find({
    userId,
    creditDate: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ creditDate: -1 });
};

// Get user ROI summary
roiHistorySchema.statics.getUserROISummary = async function (userId) {
  const summary = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'credited' } },
    {
      $group: {
        _id: null,
        totalROIEarned: { $sum: '$roiAmount' },
        totalRecords: { $sum: 1 },
        averageROI: { $avg: '$roiAmount' },
        maxROI: { $max: '$roiAmount' },
        minROI: { $min: '$roiAmount' },
      },
    },
  ]);

  return summary[0] || {
    totalROIEarned: 0,
    totalRecords: 0,
    averageROI: 0,
    maxROI: 0,
    minROI: 0,
  };
};

// Get daily ROI summary by month
roiHistorySchema.statics.getMonthlyROISummary = async function (userId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        creditDate: { $gte: startDate, $lte: endDate },
        status: 'credited',
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$creditDate' } },
        dailyROI: { $sum: '$roiAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Check if ROI was already credited for a specific investment on a specific date
roiHistorySchema.statics.roiAlreadyCredited = async function (
  userId,
  investmentId,
  creditDate
) {
  const record = await this.findOne({
    userId,
    investmentId,
    creditDate: {
      $gte: new Date(creditDate).setHours(0, 0, 0, 0),
      $lt: new Date(creditDate).setHours(23, 59, 59, 999),
    },
    status: 'credited',
  });

  return !!record;
};

module.exports = mongoose.model('ROIHistory', roiHistorySchema);