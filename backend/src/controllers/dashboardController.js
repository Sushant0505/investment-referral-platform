/**
 * Dashboard Controller
 * Handles dashboard summary and analytics endpoints
 */

const { asyncHandler, throwError } = require('../middleware/errorHandler');
const User = require('../models/User');
const Investment = require('../models/Investment');
const ROIHistory = require('../models/ROIHistory');
const ReferralIncome = require('../models/ReferralIncome');
const InvestmentService = require('../services/investmentService');
const ROIService = require('../services/roiService');
const ReferralService = require('../services/referralService');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * GET /api/dashboard/summary
 * Get dashboard summary with all key metrics
 */
const getDashboardSummary = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;

    // Get user
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Get investment summary
    const investmentSummary = await Investment.getUserInvestmentSummary(userId);

    // Get total active investments amount
    const activeInvestments = await Investment.find({
      userId,
      status: 'active',
    }).lean();

    const totalActiveInvestment = activeInvestments.reduce(
      (sum, inv) => sum + inv.investmentAmount,
      0
    );

    // Get today's ROI
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const todayROI = await ROIHistory.find({
      userId,
      creditDate: { $gte: today, $lte: todayEnd },
      status: 'credited',
    }).lean();

    const todayROIAmount = todayROI.reduce((sum, record) => sum + record.roiAmount, 0);

    // Get this month's ROI
    const thisMonthROI = await ROIHistory.getMonthlyROISummary(
      userId,
      today.getMonth() + 1,
      today.getFullYear()
    );

    const thisMonthROIAmount = thisMonthROI.reduce((sum, record) => sum + record.dailyROI, 0);

    // Get referral summary
    const referralSummary = await ReferralService.getReferralSummary(userId);

    // Get direct referrals count
    const directReferralsCount = referralSummary.summary.directReferralsCount;

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId })
      .sort({ processedAt: -1 })
      .limit(5)
      .lean();

    // Get account status
    const accountStatus = user.accountStatus;

    const dashboardData = {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        referralCode: user.referralCode,
        accountStatus,
      },
      wallet: {
        balance: user.walletBalance,
        totalROIEarned: user.totalROIEarned,
        totalLevelIncomeEarned: user.totalLevelIncomeEarned,
        totalEarnings: user.totalROIEarned + user.totalLevelIncomeEarned,
      },
      investments: {
        totalInvested: investmentSummary.totalInvested,
        totalROIGenerated: investmentSummary.totalROIGenerated,
        activeCount: investmentSummary.activeCount,
        completedCount: investmentSummary.completedCount,
        cancelledCount: investmentSummary.cancelledCount,
        totalActiveInvestment,
      },
      roi: {
        todayROI: Math.round(todayROIAmount * 100) / 100,
        thisMonthROI: Math.round(thisMonthROIAmount * 100) / 100,
        totalROIEarned: user.totalROIEarned,
        averageMonthlyROI:
          Math.round((user.totalROIEarned / Math.max(1, user.createdAt)) * 100) / 100,
      },
      referrals: {
        directReferrals: directReferralsCount,
        totalReferrals: referralSummary.summary.totalReferralsCount,
        totalReferralIncome: referralSummary.summary.totalReferralIncome,
      },
      recentTransactions: recentTransactions.slice(0, 5),
    };

    res.status(200).json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    logger.error(`Dashboard summary error: ${error.message}`);
    throwError(error.message, 500);
  }
});

/**
 * GET /api/dashboard/roi-stats
 * Get detailed ROI statistics
 */
const getROIStats = asyncHandler(async (req, res) => {
  try {
    const result = await ROIService.getUserROISummary(req.userId);

    res.status(200).json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    logger.error(`Get ROI stats error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/dashboard/referral-stats
 * Get detailed referral statistics
 */
const getReferralStats = asyncHandler(async (req, res) => {
  try {
    const result = await ReferralService.getReferralStatistics(req.userId);

    res.status(200).json({
      success: true,
      data: result.levelBreakdown,
    });
  } catch (error) {
    logger.error(`Get referral stats error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/dashboard/monthly-breakdown
 * Get monthly breakdown of earnings
 */
const getMonthlyBreakdown = asyncHandler(async (req, res) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const userId = req.userId;

    // Get monthly ROI
    const monthlyROI = await ROIHistory.getMonthlyROISummary(userId, month, year);

    // Get monthly referral income
    const monthlyReferral = await ReferralIncome.getMonthlyReferralSummary(userId, month, year);

    // Get monthly transactions
    const monthlyTransactions = await Transaction.getMonthlyTransactionSummary(userId, month, year);

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        roi: monthlyROI,
        referralIncome: monthlyReferral,
        transactions: monthlyTransactions,
      },
    });
  } catch (error) {
    logger.error(`Get monthly breakdown error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/dashboard/analytics
 * Get analytics data for charts
 */
const getAnalytics = asyncHandler(async (req, res) => {
  try {
    const userId = req.userId;
    const { type = 'roi', days = 30 } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let data = [];

    if (type === 'roi') {
      // Get daily ROI data
      const roiRecords = await ROIHistory.find({
        userId,
        creditDate: { $gte: startDate, $lte: endDate },
        status: 'credited',
      })
        .sort({ creditDate: 1 })
        .lean();

      const groupedByDate = {};
      roiRecords.forEach((record) => {
        const dateStr = record.creditDate.toISOString().split('T')[0];
        groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + record.roiAmount;
      });

      data = Object.entries(groupedByDate).map(([date, amount]) => ({
        date,
        value: Math.round(amount * 100) / 100,
        type: 'ROI',
      }));
    } else if (type === 'referral') {
      // Get daily referral income data
      const refRecords = await ReferralIncome.find({
        receiverUserId: userId,
        creditDate: { $gte: startDate, $lte: endDate },
        status: 'credited',
      })
        .sort({ creditDate: 1 })
        .lean();

      const groupedByDate = {};
      refRecords.forEach((record) => {
        const dateStr = record.creditDate.toISOString().split('T')[0];
        groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + record.incomeAmount;
      });

      data = Object.entries(groupedByDate).map(([date, amount]) => ({
        date,
        value: Math.round(amount * 100) / 100,
        type: 'Referral',
      }));
    }

    res.status(200).json({
      success: true,
      data,
      period: {
        startDate,
        endDate,
        days: parseInt(days),
      },
    });
  } catch (error) {
    logger.error(`Get analytics error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/dashboard/transaction-history
 * Get transaction history
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;

    const query = { userId: req.userId };
    if (type) {
      query.transactionType = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ processedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalRecords: total,
      },
    });
  } catch (error) {
    logger.error(`Get transaction history error: ${error.message}`);
    throwError(error.message, 400);
  }
});

module.exports = {
  getDashboardSummary,
  getROIStats,
  getReferralStats,
  getMonthlyBreakdown,
  getAnalytics,
  getTransactionHistory,
};
