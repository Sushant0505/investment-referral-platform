/**
 * InvestmentCard Component
 * Displays investment plan (for selection) or active investment details
 */

import { motion } from 'framer-motion';
import { TrendingUp, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import { formatCurrency, formatDate, formatPercent, getStatusBadgeClass } from '../../utils/format';

const planColors = {
  basic: 'from-blue-500 to-blue-700',
  standard: 'from-purple-500 to-purple-700',
  premium: 'from-orange-500 to-orange-700',
  elite: 'from-emerald-500 to-emerald-700',
};

const statusIcons = {
  active: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

/**
 * Plan selection card - used on Investments page to pick a plan
 */
export const PlanCard = ({ plan, planKey, selected, onSelect }) => {
  const StatusIcon = Clock;
  return (
    <motion.button
      whileHover={{ y: -4 }}
      onClick={() => onSelect(planKey)}
      className={clsx(
        'card p-5 text-left w-full transition-all duration-200 relative overflow-hidden',
        selected ? 'ring-2 ring-primary-500' : 'hover:shadow-md'
      )}
    >
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r',
          planColors[planKey] || planColors.basic
        )}
      ></div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white capitalize">
          {plan.name}
        </h3>
        {selected && <CheckCircle2 className="w-5 h-5 text-primary-600" />}
      </div>
      <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
        {formatPercent(plan.dailyROI)} <span className="text-sm text-gray-400">/ day</span>
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Min Investment</span>
          <span className="font-medium">{formatCurrency(plan.minInvestment)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Max Investment</span>
          <span className="font-medium">{formatCurrency(plan.maxInvestment)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>Duration</span>
          <span className="font-medium">{plan.duration} days</span>
        </div>
      </div>
    </motion.button>
  );
};

/**
 * Active/Past investment card - used to display user's investments
 */
const InvestmentCard = ({ investment, onCancel }) => {
  const StatusIcon = statusIcons[investment.status] || Clock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br',
              planColors[investment.planName] || planColors.basic
            )}
          >
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white capitalize">
              {investment.planName} Plan
            </p>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(investment.startDate)} - {formatDate(investment.endDate)}
            </p>
          </div>
        </div>
        <span className={getStatusBadgeClass(investment.status)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {investment.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center py-3 border-y border-gray-100 dark:border-dark-700">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Invested</p>
          <p className="font-bold text-sm text-gray-900 dark:text-white">
            {formatCurrency(investment.investmentAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Daily ROI</p>
          <p className="font-bold text-sm text-primary-600 dark:text-primary-400">
            {formatPercent(investment.dailyROIPercentage)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">ROI Generated</p>
          <p className="font-bold text-sm text-green-600 dark:text-green-400">
            {formatCurrency(investment.totalROIGenerated)}
          </p>
        </div>
      </div>

      {investment.status === 'active' && onCancel && (
        <button
          onClick={() => onCancel(investment._id)}
          className="mt-3 text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Cancel Investment
        </button>
      )}
    </motion.div>
  );
};

export default InvestmentCard;
