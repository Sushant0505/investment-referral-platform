/**
 * Wallet Page
 * Displays wallet balance, ROI history, and transaction history
 */

import { useState } from 'react';
import { Wallet as WalletIcon, TrendingUp, Users, Download, Filter } from 'lucide-react';

import WalletCard from '../components/dashboard/WalletCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import { useDashboardSummary, useTransactionHistory } from '../hooks/useDashboard';
import { formatCurrency, formatDateTime, getStatusBadgeClass, capitalize } from '../utils/format';

const transactionTypes = [
  { value: '', label: 'All Transactions' },
  { value: 'roi_credit', label: 'ROI Credits' },
  { value: 'referral_income', label: 'Referral Income' },
  { value: 'investment', label: 'Investments' },
  { value: 'withdrawal', label: 'Withdrawals' },
];

const typeColors = {
  roi_credit: 'text-green-600 dark:text-green-400',
  referral_income: 'text-purple-600 dark:text-purple-400',
  investment: 'text-blue-600 dark:text-blue-400',
  withdrawal: 'text-red-600 dark:text-red-400',
  refund: 'text-orange-600 dark:text-orange-400',
};

const Wallet = () => {
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);

  const { data: dashboardData, isLoading: dashboardLoading } = useDashboardSummary();
  const { data: transactionsData, isLoading: txLoading } = useTransactionHistory({
    page,
    limit: 15,
    ...(filterType && { type: filterType }),
  });

  const handleExportCSV = () => {
    if (!transactionsData?.data?.length) return;

    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
    const rows = transactionsData.data.map((tx) => [
      formatDateTime(tx.processedAt),
      capitalize(tx.transactionType.replace('_', ' ')),
      tx.description,
      tx.amount,
      tx.status,
    ]);

    const csvContent =
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wallet</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage your balance and view transaction history
        </p>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {dashboardLoading ? (
            <div className="card p-6 h-64 skeleton"></div>
          ) : (
            <WalletCard
              walletBalance={dashboardData?.wallet?.balance}
              totalROIEarned={dashboardData?.wallet?.totalROIEarned}
              totalLevelIncomeEarned={dashboardData?.wallet?.totalLevelIncomeEarned}
            />
          )}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Today's Earnings</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dashboardData?.roi?.todayROI || 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">From ROI credits</p>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Monthly ROI</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dashboardData?.roi?.thisMonthROI || 0)}
            </p>
            <p className="text-sm text-gray-400 mt-1">This calendar month</p>
          </div>

          <div className="card p-5 sm:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Account Status</p>
            </div>
            <span className={getStatusBadgeClass(dashboardData?.user?.accountStatus)}>
              {dashboardData?.user?.accountStatus || 'active'}
            </span>
            <p className="text-sm text-gray-400 mt-2">
              Referral Code:{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {dashboardData?.user?.referralCode}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-700 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">Transaction History</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className="input-field pl-9 py-2 text-sm appearance-none cursor-pointer"
              >
                {transactionTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExportCSV}
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-dark-700">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Balance After</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-dark-700">
              {txLoading ? (
                <TableSkeleton rows={8} columns={6} />
              ) : transactionsData?.data?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactionsData?.data?.map((tx) => (
                  <tr key={tx._id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {capitalize(tx.transactionType.replace('_', ' '))}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[250px] truncate">
                      {tx.description}
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        typeColors[tx.transactionType] || 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {['withdrawal'].includes(tx.transactionType) ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatCurrency(tx.balanceAfter)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={getStatusBadgeClass(tx.status)}>{tx.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDateTime(tx.processedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {transactionsData?.pagination && transactionsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-dark-700">
            <p className="text-sm text-gray-400">
              Page {transactionsData.pagination.currentPage} of{' '}
              {transactionsData.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= transactionsData.pagination.totalPages}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wallet;