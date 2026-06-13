/**
 * Dashboard Page
 * Main overview with stats, charts, and recent activity
 */

import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, Wallet, Users, PiggyBank, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import StatsCard from '../components/dashboard/StatsCard';
import WalletCard from '../components/dashboard/WalletCard';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { useDashboardSummary, useAnalytics } from '../hooks/useDashboard';
import { formatCurrency, formatDate, getStatusBadgeClass, capitalize } from '../utils/format';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f97316', '#22c55e', '#ec4899'];

const Dashboard = () => {
  const { data, isLoading, isError } = useDashboardSummary();
  const { data: roiAnalytics, isLoading: roiLoading } = useAnalytics('roi', 14);
  const { data: referralAnalytics, isLoading: refLoading } = useAnalytics('referral', 14);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="card p-10 text-center">
        <p className="text-gray-500">Failed to load dashboard data. Please try again.</p>
      </div>
    );
  }

  const { wallet, investments, roi, referrals, recentTransactions } = data;

  const distributionData = [
    { name: 'Invested', value: investments.totalActiveInvestment || 0 },
    { name: 'ROI Earned', value: wallet.totalROIEarned || 0 },
    { name: 'Referral Income', value: wallet.totalLevelIncomeEarned || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Here's an overview of your investment portfolio
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Investments"
          value={formatCurrency(investments.totalInvested)}
          icon={PiggyBank}
          color="primary"
          subtitle={`${investments.activeCount} active plans`}
        />
        <StatsCard
          title="Today's ROI"
          value={formatCurrency(roi.todayROI)}
          icon={TrendingUp}
          color="green"
          subtitle="Credited today"
        />
        <StatsCard
          title="Total ROI Earned"
          value={formatCurrency(roi.totalROIEarned)}
          icon={TrendingUp}
          color="orange"
          subtitle="Lifetime earnings"
        />
        <StatsCard
          title="Referral Income"
          value={formatCurrency(referrals.totalReferralIncome)}
          icon={Users}
          color="purple"
          subtitle={`${referrals.directReferrals} direct referrals`}
        />
      </div>

      {/* Wallet + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WalletCard
            walletBalance={wallet.balance}
            totalROIEarned={wallet.totalROIEarned}
            totalLevelIncomeEarned={wallet.totalLevelIncomeEarned}
          />
        </div>

        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Portfolio Distribution
          </h3>
          {distributionData.length === 0 ? (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
              No data to display yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            ROI Growth (Last 14 days)
          </h3>
          {roiLoading ? (
            <div className="skeleton h-[260px] w-full"></div>
          ) : roiAnalytics?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={roiAnalytics}>
                <defs>
                  <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#0ea5e9"
                  fill="url(#roiGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
              No ROI data yet. ROI is credited daily for active investments.
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Referral Income Analytics (Last 14 days)
          </h3>
          {refLoading ? (
            <div className="skeleton h-[260px] w-full"></div>
          ) : referralAnalytics?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={referralAnalytics}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
              No referral income yet. Invite friends to start earning!
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <Link
            to="/wallet"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentTransactions?.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-dark-700">
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 font-medium">Amount</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
                {recentTransactions?.map((tx) => (
                  <tr key={tx._id}>
                    <td className="py-3 font-medium text-gray-900 dark:text-white">
                      {capitalize(tx.transactionType.replace('_', ' '))}
                    </td>
                    <td className="py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">
                      {tx.description}
                    </td>
                    <td className="py-3 font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(tx.amount)}
                    </td>
                    <td className="py-3">
                      <span className={getStatusBadgeClass(tx.status)}>{tx.status}</span>
                    </td>
                    <td className="py-3 text-gray-400">{formatDate(tx.processedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
