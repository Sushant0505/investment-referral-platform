/**
 * Referral Service
 * Manages referral hierarchy, income distribution, and referral tree
 * Implements multi-level structure: Level 1 (10%), Level 2 (5%), Level 3 (3%), Level 4 (2%), Level 5 (1%)
 */

const User = require('../models/User');
const ReferralIncome = require('../models/ReferralIncome');
const Transaction = require('../models/Transaction');
const Investment = require('../models/Investment');
const logger = require('../utils/logger');

class ReferralService {
  /**
   * Level commission structure
   */
  static getLevelCommission(level) {
    const commissions = {
      1: 10,
      2: 5,
      3: 3,
      4: 2,
      5: 1,
    };
    return commissions[level] || 0;
  }

  /**
   * Get direct referrals (Level 1 only)
   */
  static async getDirectReferrals(userId, filters = {}) {
    try {
      const query = { referredBy: userId };

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const referrals = await User.find(query)
        .select('_id fullName email mobileNumber referralCode createdAt accountStatus')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      // Add investment stats for each referral
      const referralsWithStats = await Promise.all(
        referrals.map(async (ref) => {
          const stats = await Investment.getUserInvestmentSummary(ref._id);
          return {
            ...ref,
            investmentStats: stats,
          };
        })
      );

      const total = await User.countDocuments(query);

      return {
        success: true,
        directReferrals: referralsWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit,
        },
      };
    } catch (error) {
      logger.error(`Get direct referrals error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get complete referral tree (multi-level)
   */
  static async getReferralTree(userId, depth = 5) {
    try {
      const tree = await this.buildReferralTree(userId, depth);

      return {
        success: true,
        tree,
      };
    } catch (error) {
      logger.error(`Get referral tree error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build referral tree recursively
   */
  static async buildReferralTree(userId, remainingDepth = 5, currentLevel = 1) {
    if (remainingDepth <= 0) {
      return null;
    }

    const user = await User.findById(userId)
      .select('_id fullName email referralCode accountStatus createdAt')
      .lean();

    if (!user) {
      return null;
    }

    // Get direct referrals
    const referrals = await User.find({ referredBy: userId })
      .select('_id fullName email referralCode accountStatus createdAt')
      .lean();

    // Recursively build tree for each referral
    const childrenWithTree = await Promise.all(
      referrals.map(async (referral) => {
        const childTree = await this.buildReferralTree(referral._id, remainingDepth - 1, currentLevel + 1);
        return {
          ...referral,
          children: childTree ? childTree.children : [],
          level: currentLevel + 1,
        };
      })
    );

    return {
      ...user,
      level: currentLevel,
      childrenCount: referrals.length,
      children: childrenWithTree,
    };
  }

  /**
   * Distribute referral income when investment is created
   * Traverses up the referral hierarchy and credits income to eligible ancestors
   */
  static async distributeReferralIncome(investmentId, investmentAmount) {
    const session = await User.startSession();
    session.startTransaction();

    try {
      // Get investment
      const investment = await Investment.findById(investmentId).session(session);
      if (!investment) {
        throw new Error('Investment not found');
      }

      // Get investor
      const investor = await User.findById(investment.userId).session(session);
      if (!investor) {
        throw new Error('Investor not found');
      }

      logger.info(`Starting referral income distribution for investment: ${investmentId}`);

      let currentUser = investor;
      let referralPath = [];
      const maxLevels = 5;
      const results = [];

      // Traverse up the referral chain
      for (let level = 1; level <= maxLevels; level++) {
        // Check if user has a referrer
        if (!currentUser.referredBy) {
          logger.debug(`No referrer found for user at level ${level}`);
          break;
        }

        // Get parent user
        const parentUser = await User.findById(currentUser.referredBy).session(session);

        if (!parentUser) {
          logger.warn(`Parent user not found for referral at level ${level}`);
          break;
        }

        // Check if parent is eligible for referral income
        if (parentUser.accountStatus !== 'active') {
          logger.debug(`Parent user not active at level ${level}`);
          currentUser = parentUser;
          continue;
        }

        // Calculate commission for this level
        const commissionPercentage = this.getLevelCommission(level);
        const incomeAmount = (investmentAmount * commissionPercentage) / 100;

        if (incomeAmount <= 0) {
          currentUser = parentUser;
          continue;
        }

        // Create referral income record
        const referralIncomeRecord = new ReferralIncome({
          receiverUserId: parentUser._id,
          sourceUserId: investment.userId,
          level,
          incomeAmount,
          incomePercentage: commissionPercentage,
          investmentAmount,
          investmentId,
          creditDate: new Date(),
          status: 'credited',
          transactionId: `REF_${investmentId}_${level}_${Date.now()}`,
          referralPath: referralPath,
        });

        await referralIncomeRecord.save({ session });

        // Update parent's wallet and total level income
        const balanceBefore = parentUser.walletBalance;
        parentUser.walletBalance += incomeAmount;
        parentUser.totalLevelIncomeEarned += incomeAmount;
        await parentUser.save({ session });

        // Create transaction record
        await Transaction.create(
          [
            {
              userId: parentUser._id,
              transactionType: 'referral_income',
              amount: incomeAmount,
              balanceBefore,
              balanceAfter: parentUser.walletBalance,
              description: `Level ${level} referral income from new investment`,
              source: 'system',
              relatedDocuments: {
                investmentId,
                referralIncomeId: referralIncomeRecord._id,
              },
              status: 'completed',
            },
          ],
          { session }
        );

        referralPath.push({
          userId: parentUser._id,
          level,
        });

        results.push({
          level,
          receiverId: parentUser._id,
          receiverEmail: parentUser.email,
          incomeAmount,
          status: 'credited',
        });

        logger.info(`Referral income credited: ${incomeAmount} to ${parentUser.email} (Level ${level})`);

        // Move up to next level
        currentUser = parentUser;
      }

      await session.commitTransaction();

      logger.info(
        `Referral income distribution completed for investment: ${investmentId}, distributed to ${results.length} users`
      );

      return {
        success: true,
        investmentId,
        investmentAmount,
        distributedToUsers: results.length,
        results,
        message: `Referral income distributed to ${results.length} users`,
      };
    } catch (error) {
      await session.abortTransaction();
      logger.error(`Referral income distribution error: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get referral income history
   */
  static async getReferralIncomeHistory(userId, filters = {}) {
    try {
      const query = { receiverUserId: userId, status: 'credited' };

      // Apply filters
      if (filters.level) {
        query.level = filters.level;
      }

      if (filters.startDate && filters.endDate) {
        query.creditDate = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const history = await ReferralIncome.find(query)
        .populate('sourceUserId', 'fullName email')
        .sort({ creditDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await ReferralIncome.countDocuments(query);

      return {
        success: true,
        data: history,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit,
        },
      };
    } catch (error) {
      logger.error(`Get referral income history error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referral summary
   */
  static async getReferralSummary(userId) {
    try {
      // Get referral income summary
      const incomeStats = await ReferralIncome.getUserReferralSummary(userId);

      // Get direct referrals count
      const directReferralsCount = await User.countDocuments({ referredBy: userId });

      // Get all indirect referrals
      const allReferrals = await this.getAllReferrals(userId);

      // Get monthly summary
      const currentDate = new Date();
      const monthlyData = await ReferralIncome.getMonthlyReferralSummary(
        userId,
        currentDate.getMonth() + 1,
        currentDate.getFullYear()
      );

      return {
        success: true,
        summary: {
          totalReferralIncome: incomeStats.totalReferralIncome,
          directReferralsCount,
          totalReferralsCount: allReferrals.length,
          byLevel: incomeStats.byLevel,
          monthlyBreakdown: monthlyData,
        },
      };
    } catch (error) {
      logger.error(`Get referral summary error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all referrals (direct and indirect)
   */
  static async getAllReferrals(userId) {
    try {
      const allReferrals = [];

      const traverse = async (parentId) => {
        const children = await User.find({ referredBy: parentId }).select('_id').lean();

        for (const child of children) {
          allReferrals.push(child._id);
          await traverse(child._id);
        }
      };

      await traverse(userId);
      return allReferrals;
    } catch (error) {
      logger.error(`Get all referrals error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get referral statistics
   */
  static async getReferralStatistics(userId) {
    try {
      const stats = await ReferralIncome.getDownlineIncome(userId);

      const levelBreakdown = {
        level1: { count: 0, income: 0 },
        level2: { count: 0, income: 0 },
        level3: { count: 0, income: 0 },
        level4: { count: 0, income: 0 },
        level5: { count: 0, income: 0 },
      };

      stats.forEach((item) => {
        const levelKey = `level${item._id}`;
        if (levelBreakdown[levelKey]) {
          levelBreakdown[levelKey].count = item.count;
          levelBreakdown[levelKey].income = Math.round(item.totalIncome * 100) / 100;
        }
      });

      return {
        success: true,
        levelBreakdown,
      };
    } catch (error) {
      logger.error(`Get referral statistics error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ReferralService;
