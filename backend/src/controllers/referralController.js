/**
 * Referral Controller
 * Handles referral operations and referral tree
 */

const { asyncHandler, throwError } = require('../middleware/errorHandler');
const ReferralService = require('../services/referralService');
const logger = require('../utils/logger');

/**
 * GET /api/referrals/direct
 * Get direct referrals (Level 1)
 */
const getDirectReferrals = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const result = await ReferralService.getDirectReferrals(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      data: result.directReferrals,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error(`Get direct referrals error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/tree
 * Get complete referral tree
 */
const getReferralTree = asyncHandler(async (req, res) => {
  try {
    const { depth = 5 } = req.query;

    const result = await ReferralService.getReferralTree(req.userId, parseInt(depth));

    res.status(200).json({
      success: true,
      data: result.tree,
    });
  } catch (error) {
    logger.error(`Get referral tree error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/income-history
 * Get referral income history
 */
const getReferralIncomeHistory = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      level,
      startDate,
      endDate,
    } = req.query;

    const result = await ReferralService.getReferralIncomeHistory(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      level: level ? parseInt(level) : undefined,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error(`Get referral income history error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/summary
 * Get referral summary
 */
const getReferralSummary = asyncHandler(async (req, res) => {
  try {
    const result = await ReferralService.getReferralSummary(req.userId);

    res.status(200).json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    logger.error(`Get referral summary error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/statistics
 * Get referral statistics
 */
const getReferralStatistics = asyncHandler(async (req, res) => {
  try {
    const result = await ReferralService.getReferralStatistics(req.userId);

    res.status(200).json({
      success: true,
      data: result.levelBreakdown,
    });
  } catch (error) {
    logger.error(`Get referral statistics error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/link
 * Get referral link
 */
const getReferralLink = asyncHandler(async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`;

    res.status(200).json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink,
      },
    });
  } catch (error) {
    logger.error(`Get referral link error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/referrals/levels
 * Get referral level details
 */
const getReferralLevels = asyncHandler(async (req, res) => {
  try {
    const levels = [
      {
        level: 1,
        commission: 10,
        description: 'Direct referrals commission',
      },
      {
        level: 2,
        commission: 5,
        description: 'Level 2 indirect commission',
      },
      {
        level: 3,
        commission: 3,
        description: 'Level 3 indirect commission',
      },
      {
        level: 4,
        commission: 2,
        description: 'Level 4 indirect commission',
      },
      {
        level: 5,
        commission: 1,
        description: 'Level 5 indirect commission',
      },
    ];

    res.status(200).json({
      success: true,
      data: levels,
    });
  } catch (error) {
    logger.error(`Get referral levels error: ${error.message}`);
    throwError(error.message, 400);
  }
});

module.exports = {
  getDirectReferrals,
  getReferralTree,
  getReferralIncomeHistory,
  getReferralSummary,
  getReferralStatistics,
  getReferralLink,
  getReferralLevels,
};
