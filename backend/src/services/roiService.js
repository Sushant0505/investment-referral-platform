/**
 * ROI Service
 * Handles daily ROI calculation and wallet updates
 * Implements idempotency to prevent duplicate ROI credits
 */

const Investment = require('../models/Investment');
const ROIHistory = require('../models/ROIHistory');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

class ROIService {
  /**
   * Process daily ROI for all active investments
   * This is called by the cron job every day at 12:00 AM
   * Implements idempotency using compound unique index
   */
  static async processDailyROI(specificDate = null) {
    const session = await Investment.startSession();
    session.startTransaction();

    const creditDate = specificDate || new Date();
    creditDate.setHours(0, 0, 0, 0);

    try {
      logger.info(`Starting ROI processing for date: ${creditDate}`);

      // Get all active investments that are still within their duration
      const activeInvestments = await Investment.find({
        status: 'active',
        startDate: { $lte: creditDate },
        endDate: { $gt: creditDate },
      })
        .session(session)
        .populate('userId');

      logger.info(`Found ${activeInvestments.length} active investments to process`);

      let processedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const investment of activeInvestments) {
        try {
          // Check if ROI was already credited for this investment on this date
          // Using compound unique index for idempotency
          const existingROI = await ROIHistory.findOne({
            userId: investment.userId._id,
            investmentId: investment._id,
            creditDate: {
              $gte: creditDate,
              $lt: new Date(creditDate.getTime() + 24 * 60 * 60 * 1000),
            },
            status: 'credited',
          }).session(session);

          if (existingROI) {
            logger.debug(`ROI already credited for investment: ${investment._id}`);
            continue;
          }

          // Calculate daily ROI
          const dailyROI = investment.calculateDailyROI();

          if (dailyROI <= 0) {
            logger.debug(`No ROI to credit for investment: ${investment._id}`);
            continue;
          }

          // Create ROI history record
          const roiRecord = new ROIHistory({
            userId: investment.userId._id,
            investmentId: investment._id,
            roiAmount: dailyROI,
            roiPercentage: investment.dailyROIPercentage,
            investmentAmount: investment.investmentAmount,
            creditDate,
            status: 'credited',
            processedAt: new Date(),
            cronJobId: `cron_${new Date().getTime()}`,
          });

          await roiRecord.save({ session });

          // Update investment's total ROI and last ROI date
          investment.totalROIGenerated += dailyROI;
          investment.lastROIDate = creditDate;
          await investment.save({ session });

          // Update user's wallet and total ROI earned
          const user = investment.userId;
          const balanceBefore = user.walletBalance;
          user.walletBalance += dailyROI;
          user.totalROIEarned += dailyROI;
          await user.save({ session });

          // Create transaction record
          await Transaction.create(
            [
              {
                userId: user._id,
                transactionType: 'roi_credit',
                amount: dailyROI,
                balanceBefore,
                balanceAfter: user.walletBalance,
                description: `Daily ROI credit from investment`,
                source: 'cron_job',
                relatedDocuments: {
                  investmentId: investment._id,
                  roiHistoryId: roiRecord._id,
                },
                status: 'completed',
              },
            ],
            { session }
          );

          processedCount++;
          results.push({
            investmentId: investment._id,
            userId: user._id,
            roiAmount: dailyROI,
            status: 'success',
          });

          logger.info(`ROI credited: ${dailyROI} for investment: ${investment._id}`);
        } catch (error) {
          failedCount++;
          logger.error(`ROI processing failed for investment ${investment._id}: ${error.message}`);
          results.push({
            investmentId: investment._id,
            userId: investment.userId._id,
            error: error.message,
            status: 'failed',
          });
        }
      }

      await session.commitTransaction();

      logger.info(`ROI processing completed: ${processedCount} succeeded, ${failedCount} failed`);

      return {
        success: true,
        processedCount,
        failedCount,
        date: creditDate,
        results,
        message: `Processed ${processedCount} investments, ${failedCount} failed`,
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Daily ROI processing error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get ROI history for a user
   */
  static async getUserROIHistory(userId, filters = {}) {
    try {
      const query = { userId, status: 'credited' };

      // Apply date range filter
      if (filters.startDate && filters.endDate) {
        query.creditDate = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const roiHistory = await ROIHistory.find(query)
        .populate('investmentId', 'planName investmentAmount')
        .sort({ creditDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ROIHistory.countDocuments(query);

      return {
        success: true,
        data: roiHistory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit,
        },
      };
    } catch (error) {
      logger.error(`Get ROI history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get ROI summary for user
   */
  static async getUserROISummary(userId) {
    try {
      const summary = await ROIHistory.getUserROISummary(userId);

      // Get monthly breakdown
      const currentDate = new Date();
      const monthlyData = await ROIHistory.getMonthlyROISummary(
        userId,
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );

      return {
        success: true,
        summary: {
          totalROIEarned: summary.totalROIEarned,
          totalRecords: summary.totalRecords,
          averageROI: summary.averageROI,
          maxROI: summary.maxROI,
          minROI: summary.minROI,
          monthlyBreakdown: monthlyData,
        },
      };
    } catch (error) {
      logger.error(`Get ROI summary error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Manual ROI credit for testing or corrections
   */
  static async manualROICredit(investmentId, userId, amount, remarks = '') {
    const session = await Investment.startSession();
    session.startTransaction();

    try {
      // Verify investment
      const investment = await Investment.findOne({
        _id: investmentId,
        userId,
      }).session(session);

      if (!investment) {
        throw new Error('Investment not found');
      }

      // Get user
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      // Create ROI history
      const roiRecord = new ROIHistory({
        userId,
        investmentId,
        roiAmount: amount,
        roiPercentage: 0,
        investmentAmount: investment.investmentAmount,
        creditDate: new Date(),
        status: 'credited',
        remarks,
      });

      await roiRecord.save({ session });

      // Update user balance
      const balanceBefore = user.walletBalance;
      user.walletBalance += amount;
      user.totalROIEarned += amount;
      await user.save({ session });

      // Create transaction
      await Transaction.create(
        [
          {
            userId,
            transactionType: 'roi_credit',
            amount,
            balanceBefore,
            balanceAfter: user.walletBalance,
            description: `Manual ROI credit: ${remarks}`,
            source: 'admin',
            relatedDocuments: {
              investmentId,
              roiHistoryId: roiRecord._id,
            },
          },
        ],
        { session }
      );

      await session.commitTransaction();

      logger.info(`Manual ROI credited: ${amount} for investment: ${investmentId}`);

      return {
        success: true,
        message: 'ROI credited successfully',
        roiRecord: roiRecord.toObject(),
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Manual ROI credit error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Verify ROI data integrity
   */
  static async verifyROIDataIntegrity(userId) {
    try {
      // Get all user ROI records
      const roiRecords = await ROIHistory.find({
        userId,
        status: 'credited',
      }).lean();

      // Calculate total from records
      const totalFromRecords = roiRecords.reduce((sum, record) => sum + record.roiAmount, 0);

      // Get user's total ROI earned
      const user = await User.findById(userId).lean();
      const userTotal = user.totalROIEarned;

      const isIntact = Math.abs(totalFromRecords - userTotal) < 0.01; // Allow for floating point errors

      return {
        success: true,
        isIntact,
        totalFromRecords: Math.round(totalFromRecords * 100) / 100,
        userTotal: userTotal,
        discrepancy: Math.round((userTotal - totalFromRecords) * 100) / 100,
      };
    } catch (error) {
      logger.error(`ROI data integrity check error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ROIService;
