/**
 * Investment Service
 * Manages investment creation, retrieval, and ROI calculations
 */

const Investment = require('../models/Investment');
const User = require('../models/User');
const ROIHistory = require('../models/ROIHistory');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

class InvestmentService {
  /**
   * Get plan details
   */
  static getPlanDetails(planName) {
    const plans = {
      basic: {
        name: 'Basic',
        minInvestment: 100,
        maxInvestment: 50000,
        dailyROI: 0.5,
        duration: 30,
        description: 'Perfect for beginners',
      },
      standard: {
        name: 'Standard',
        minInvestment: 50001,
        maxInvestment: 200000,
        dailyROI: 1,
        duration: 60,
        description: 'Popular choice',
      },
      premium: {
        name: 'Premium',
        minInvestment: 200001,
        maxInvestment: 500000,
        dailyROI: 1.5,
        duration: 90,
        description: 'High returns',
      },
      elite: {
        name: 'Elite',
        minInvestment: 500001,
        maxInvestment: 10000000,
        dailyROI: 2,
        duration: 180,
        description: 'Maximum returns',
      },
    };

    return plans[planName] || null;
  }

  /**
   * Create new investment
   */
  static async createInvestment(userId, investmentData) {
    const session = await Investment.startSession();
    session.startTransaction();

    try {
      const { investmentAmount, planName } = investmentData;

      // Validate plan
      const plan = this.getPlanDetails(planName);
      if (!plan) {
        throw new Error('Invalid investment plan');
      }

      if (investmentAmount < plan.minInvestment || investmentAmount > plan.maxInvestment) {
        throw new Error(
          `Investment amount must be between ${plan.minInvestment} and ${plan.maxInvestment}`
        );
      }

      // Get user
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Create investment
      const investment = new Investment({
        userId,
        investmentAmount,
        planName,
        dailyROIPercentage: plan.dailyROI,
        status: 'active',
      });

      await investment.save({ session });

      // Create transaction record
      await Transaction.create(
        [
          {
            userId,
            transactionType: 'investment',
            amount: investmentAmount,
            balanceBefore: user.walletBalance,
            balanceAfter: user.walletBalance,
            description: `Investment created - Plan: ${plan.name}`,
            source: 'user',
            relatedDocuments: {
              investmentId: investment._id,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(`Investment created for user: ${user.email}`, {
        investmentId: investment._id,
        amount: investmentAmount,
        plan: planName,
      });

      return {
        success: true,
        investment: investment.toObject(),
        message: 'Investment created successfully',
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Investment creation error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get user's investments
   */
  static async getUserInvestments(userId, filters = {}) {
    try {
      const query = { userId };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.planName) {
        query.planName = filters.planName;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const investments = await Investment.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await Investment.countDocuments(query);

      return {
        success: true,
        data: investments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit,
        },
      };
    } catch (error) {
      logger.error(`Get user investments error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get single investment details
   */
  static async getInvestmentDetails(investmentId, userId) {
    try {
      const investment = await Investment.findOne({
        _id: investmentId,
        userId,
      }).populate('userId', 'fullName email');

      if (!investment) {
        throw new Error('Investment not found');
      }

      // Get ROI history for this investment
      const roiHistory = await ROIHistory.find({
        investmentId,
        status: 'credited',
      }).sort({ creditDate: -1 });

      return {
        success: true,
        investment: investment.toObject(),
        roiHistory,
      };
    } catch (error) {
      logger.error(`Get investment details error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel investment
   */
  static async cancelInvestment(investmentId, userId, reason = '') {
    const session = await Investment.startSession();
    session.startTransaction();

    try {
      const investment = await Investment.findOne({
        _id: investmentId,
        userId,
      }).session(session);

      if (!investment) {
        throw new Error('Investment not found');
      }

      if (investment.status !== 'active') {
        throw new Error(`Cannot cancel ${investment.status} investment`);
      }

      // Update investment status
      investment.status = 'cancelled';
      investment.cancellationReason = reason;
      investment.cancelledAt = new Date();
      await investment.save({ session });

      // Create transaction record
      await Transaction.create(
        [
          {
            userId,
            transactionType: 'refund',
            amount: investment.totalROIGenerated,
            description: `Investment cancelled - Refund of accumulated ROI`,
            source: 'system',
            relatedDocuments: {
              investmentId: investment._id,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(`Investment cancelled: ${investmentId}`);

      return {
        success: true,
        investment: investment.toObject(),
        message: 'Investment cancelled successfully',
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Cancel investment error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get investment summary for user
   */
  static async getInvestmentSummary(userId) {
    try {
      const summary = await Investment.getUserInvestmentSummary(userId);

      const activeInvestments = await Investment.find({
        userId,
        status: 'active',
      }).lean();

      const totalActive = activeInvestments.reduce((sum, inv) => sum + inv.investmentAmount, 0);

      return {
        success: true,
        summary: {
          ...summary,
          totalActiveInvestment: totalActive,
          activeInvestmentsCount: activeInvestments.length,
        },
      };
    } catch (error) {
      logger.error(`Get investment summary error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate expected ROI for an investment
   */
  static calculateExpectedROI(investmentAmount, dailyROI, durationDays) {
    return (investmentAmount * dailyROI * durationDays) / 100;
  }

  /**
   * Get available investment plans
   */
  static getAvailablePlans() {
    return {
      basic: this.getPlanDetails('basic'),
      standard: this.getPlanDetails('standard'),
      premium: this.getPlanDetails('premium'),
      elite: this.getPlanDetails('elite'),
    };
  }
}

module.exports = InvestmentService;
