/**
 * Investment Controller
 * Handles investment creation, retrieval, and cancellation
 */

const { asyncHandler, throwError } = require('../middleware/errorHandler');
const InvestmentService = require('../services/investmentService');
const ReferralService = require('../services/referralService');
const logger = require('../utils/logger');

/**
 * POST /api/investments/create
 * Create new investment
 */
const createInvestment = asyncHandler(async (req, res) => {
  try {
    const { investmentAmount, planName } = req.body;

    const result = await InvestmentService.createInvestment(req.userId, {
      investmentAmount,
      planName,
    });

    // Trigger referral income distribution
    if (result.success) {
      try {
        await ReferralService.distributeReferralIncome(
          result.investment._id,
          investmentAmount
        );
      } catch (error) {
        logger.warn(`Referral income distribution failed: ${error.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Investment created successfully',
      data: result.investment,
    });
  } catch (error) {
    logger.error(`Create investment error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/investments/my-investments
 * Get user's investments
 */
const getMyInvestments = asyncHandler(async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      planName: req.query.planName,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
    };

    const result = await InvestmentService.getUserInvestments(req.userId, filters);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error(`Get investments error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/investments/:id
 * Get investment details
 */
const getInvestmentDetails = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const result = await InvestmentService.getInvestmentDetails(id, req.userId);

    res.status(200).json({
      success: true,
      data: result.investment,
      roiHistory: result.roiHistory,
    });
  } catch (error) {
    logger.error(`Get investment details error: ${error.message}`);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    throwError(error.message, 400);
  }
});

/**
 * POST /api/investments/:id/cancel
 * Cancel investment
 */
const cancelInvestment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await InvestmentService.cancelInvestment(id, req.userId, reason);

    res.status(200).json({
      success: true,
      message: 'Investment cancelled successfully',
      data: result.investment,
    });
  } catch (error) {
    logger.error(`Cancel investment error: ${error.message}`);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    throwError(error.message, 400);
  }
});

/**
 * GET /api/investments/summary
 * Get investment summary
 */
const getInvestmentSummary = asyncHandler(async (req, res) => {
  try {
    const result = await InvestmentService.getInvestmentSummary(req.userId);

    res.status(200).json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    logger.error(`Get investment summary error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * GET /api/investments/plans
 * Get available investment plans
 */
const getAvailablePlans = asyncHandler(async (req, res) => {
  try {
    const plans = InvestmentService.getAvailablePlans();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error(`Get available plans error: ${error.message}`);
    throwError(error.message, 400);
  }
});

/**
 * POST /api/investments/calculate-roi
 * Calculate expected ROI
 */
const calculateROI = asyncHandler(async (req, res) => {
  try {
    const { investmentAmount, planName } = req.body;

    const plan = InvestmentService.getPlanDetails(planName);

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan name',
      });
    }

    const expectedROI = InvestmentService.calculateExpectedROI(
      investmentAmount,
      plan.dailyROI,
      plan.duration
    );

    res.status(200).json({
      success: true,
      data: {
        investmentAmount,
        planName: plan.name,
        dailyROI: plan.dailyROI,
        duration: plan.duration,
        expectedROI: Math.round(expectedROI * 100) / 100,
        totalReturn: Math.round((investmentAmount + expectedROI) * 100) / 100,
      },
    });
  } catch (error) {
    logger.error(`Calculate ROI error: ${error.message}`);
    throwError(error.message, 400);
  }
});

module.exports = {
  createInvestment,
  getMyInvestments,
  getInvestmentDetails,
  cancelInvestment,
  getInvestmentSummary,
  getAvailablePlans,
  calculateROI,
};
