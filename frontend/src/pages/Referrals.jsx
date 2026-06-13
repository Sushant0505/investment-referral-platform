/**
 * Referrals Page
 * Displays referral tree, direct referrals, level breakdown, and income history
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Users, Gift, Check, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

import ReferralTree from '../components/dashboard/ReferralTree';
import StatsCard from '../components/dashboard/StatsCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import {
  useReferralTree,
  useDirectReferrals,
  useReferralIncomeHistory,
  useReferralSummary,
  useReferralLink,
} from '../hooks/useReferrals';
import { formatCurrency, formatDate, getStatusBadgeClass, capitalize } from '../utils/format';

const levelInfo = [
  { level: 1, commission: 10, color: 'bg-primary-500' },
  { level: 2, commission: 5, color: 'bg-purple-500' },
  { level: 3, commission: 3, color: 'bg-orange-500' },
  { level: 4, commission: 2, color: 'bg-green-500' },
  { level: 5, commission: 1, color: 'bg-pink-500' },
];

const Referrals = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('tree');

  const { data: tree, isLoading: treeLoading } = useReferralTree(5);
  const { data: directData, isLoading: directLoading } = useDirectReferrals({ limit: 50 });
  const { data: incomeHistory, isLoading: incomeLoading } = useReferralIncomeHistory({
    limit: 20,
  });
  const { data: summary } = useReferralSummary();
  const { data: linkData } = useReferralLink();

  const handleCopy = () => {
    if (linkData?.referralLink) {
      navigator.clipboard.writeText(linkData.referralLink);
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referral Program</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Earn up to 5 levels of referral income by inviting others
        </p>
      </div>

      {/* Referral Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 bg-gradient-to-br from-purple-600 to-primary-700 border-0 text-white"
      >
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-5 h-5" />
          <span className="font-semibold">Your Referral Link</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-white/15 rounded-xl px-4 py-3 text-sm font-mono truncate">
            {linkData?.referralLink || 'Loading...'}
          </div>
          <button
            onClick={handleCopy}
            className="bg-white text-primary-700 font-semibold px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        {linkData?.referralCode && (
          <p className="text-sm text-primary-100 mt-3">
            Your referral code: <span className="font-bold">{linkData.referralCode}</span>
          </p>
        )}
      </motion.div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Direct Referrals"
            value={summary.directReferralsCount}
            icon={Users}
            color="primary"
          />
          <StatsCard
            title="Total Referrals"
            value={summary.totalReferralsCount}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Total Income"
            value={formatCurrency(summary.totalReferralIncome)}
            icon={TrendingUp}
            color="green"
          />
          <StatsCard
            title="This Month"
            value={formatCurrency(
              summary.monthlyBreakdown?.reduce((sum, d) => sum + d.dailyIncome, 0) || 0
            )}
            icon={TrendingUp}
            color="orange"
          />
        </div>
      )}

      {/* Level Breakdown */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Commission Structure & Earnings by Level
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {levelInfo.map(({ level, commission, color }) => {
            const levelData = summary?.byLevel?.[`level${level}`];
            return (
              <div
                key={level}
                className="border border-gray-100 dark:border-dark-700 rounded-xl p-4 text-center"
              >
                <div
                  className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2`}
                >
                  L{level}
                </div>
                <p className="text-sm text-gray-400 mb-1">{commission}% Commission</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(levelData?.totalIncome || 0)}
                </p>
                <p className="text-xs text-gray-400">{levelData?.count || 0} payouts</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 p-1 rounded-xl w-fit">
        {['tree', 'direct', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tab === 'tree' ? 'Referral Tree' : tab === 'direct' ? 'Direct Referrals' : 'Income History'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tree' && (
        <div>
          {treeLoading ? (
            <div className="card p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-10 w-full"></div>
              ))}
            </div>
          ) : (
            <ReferralTree tree={tree} />
          )}
        </div>
      )}

      {activeTab === 'direct' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-dark-700">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Total Invested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {directLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : directData?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">
                      No direct referrals yet. Share your link to start earning!
                    </td>
                  </tr>
                ) : (
                  directData?.data?.map((ref) => (
                    <tr key={ref._id}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {ref.fullName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{ref.email}</td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(ref.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadgeClass(ref.accountStatus)}>
                          {ref.accountStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(ref.investmentStats?.totalInvested || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-dark-700">
                  <th className="px-4 py-3 font-medium">From</th>
                  <th className="px-4 py-3 font-medium">Level</th>
                  <th className="px-4 py-3 font-medium">Percentage</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {incomeLoading ? (
                  <TableSkeleton rows={5} columns={6} />
                ) : incomeHistory?.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      No referral income recorded yet
                    </td>
                  </tr>
                ) : (
                  incomeHistory?.data?.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {item.sourceUserId?.fullName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-info">Level {item.level}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                        {item.incomePercentage}%
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600 dark:text-green-400">
                        +{formatCurrency(item.incomeAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(item.creditDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Referrals;
