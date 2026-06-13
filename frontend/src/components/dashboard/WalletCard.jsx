/**
 * WalletCard Component
 * Displays wallet balance with earnings breakdown
 */

import { motion } from 'framer-motion';
import { Wallet, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

const WalletCard = ({ walletBalance = 0, totalROIEarned = 0, totalLevelIncomeEarned = 0 }) => {
  const totalEarnings = totalROIEarned + totalLevelIncomeEarned;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="card p-6 bg-gradient-to-br from-primary-600 via-primary-700 to-dark-900 border-0 text-white relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
      <div className="absolute bottom-0 right-10 w-24 h-24 bg-white/5 rounded-full"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-primary-100">Wallet Balance</span>
          </div>
          <span className="badge bg-white/15 text-white">
            <ArrowUpRight className="w-3 h-3 mr-1" />
            Active
          </span>
        </div>

        <p className="text-3xl sm:text-4xl font-bold mb-1">{formatCurrency(walletBalance)}</p>
        <p className="text-primary-100 text-sm mb-6">Available for withdrawal</p>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-primary-100">ROI Earned</p>
              <p className="font-semibold">{formatCurrency(totalROIEarned)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-primary-100">Referral Income</p>
              <p className="font-semibold">{formatCurrency(totalLevelIncomeEarned)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm text-primary-100">Total Earnings</span>
          <span className="font-bold text-lg">{formatCurrency(totalEarnings)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default WalletCard;
