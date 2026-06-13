/**
 * Investments Page
 * Browse plans, create new investments, and view investment history
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Plus, Wallet, X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

import { PlanCard } from '../components/dashboard/InvestmentCard';
import InvestmentCard from '../components/dashboard/InvestmentCard';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { CardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import {
  useInvestmentPlans,
  useInvestments,
  useInvestmentSummary,
  useCreateInvestment,
  useCancelInvestment,
} from '../hooks/useInvestments';
import { formatCurrency, formatDate, getStatusBadgeClass, capitalize } from '../utils/format';

const tabs = ['all', 'active', 'completed', 'cancelled'];

const Investments = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: plans, isLoading: plansLoading } = useInvestmentPlans();
  const { data: summary } = useInvestmentSummary();
  const { data: investmentsData, isLoading: investmentsLoading } = useInvestments(
    activeTab === 'all' ? {} : { status: activeTab }
  );

  const createInvestment = useCreateInvestment();
  const cancelInvestment = useCancelInvestment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    try {
      await createInvestment.mutateAsync({
        investmentAmount: parseFloat(data.investmentAmount),
        planName: selectedPlan,
      });
      setShowModal(false);
      setSelectedPlan(null);
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this investment?')) {
      await cancelInvestment.mutateAsync({ id, reason: 'User requested cancellation' });
    }
  };

  const investments = investmentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investments</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Choose a plan and start earning daily returns
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>
          New Investment
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-sm text-gray-400 mb-1">Total Invested</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(summary.totalInvested)}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-400 mb-1">Active Investments</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {summary.activeCount}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-gray-400 mb-1">Total ROI Generated</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalROIGenerated)}
            </p>
          </div>
        </div>
      )}

      {/* Investment Plans */}
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Available Plans</h2>
        {plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans &&
              Object.entries(plans).map(([key, plan]) => (
                <PlanCard
                  key={key}
                  planKey={key}
                  plan={plan}
                  selected={selectedPlan === key}
                  onSelect={(k) => {
                    setSelectedPlan(k);
                    setShowModal(true);
                  }}
                />
              ))}
          </div>
        )}
      </div>

      {/* Investment History */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Investment History</h2>
          <div className="flex gap-1 bg-gray-100 dark:bg-dark-800 p-1 rounded-xl">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {investmentsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : investments.length === 0 ? (
          <div className="card p-10 text-center">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">
              No {activeTab !== 'all' ? activeTab : ''} investments found
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {investments.map((investment) => (
              <InvestmentCard
                key={investment._id}
                investment={investment}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Investment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-md p-6 relative"
          >
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedPlan(null);
                reset();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Create New Investment
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Select a plan and enter the investment amount
            </p>

            {/* Plan selector */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {plans &&
                Object.entries(plans).map(([key, plan]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPlan(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPlan === key
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-dark-600 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm capitalize text-gray-900 dark:text-white">
                      {plan.name}
                    </p>
                    <p className="text-xs text-primary-600 dark:text-primary-400">
                      {plan.dailyROI}% / day
                    </p>
                  </button>
                ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Investment Amount (₹)"
                type="number"
                icon={Wallet}
                placeholder="Enter amount"
                error={errors.investmentAmount?.message}
                {...register('investmentAmount', {
                  required: 'Investment amount is required',
                  min: { value: 100, message: 'Minimum investment is ₹100' },
                  max: { value: 10000000, message: 'Maximum investment is ₹10,000,000' },
                })}
              />

              {selectedPlan && plans?.[selectedPlan] && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-700 p-3 rounded-xl">
                  Range for{' '}
                  <span className="font-semibold capitalize">{plans[selectedPlan].name}</span>:{' '}
                  {formatCurrency(plans[selectedPlan].minInvestment)} -{' '}
                  {formatCurrency(plans[selectedPlan].maxInvestment)}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={createInvestment.isPending}
                disabled={!selectedPlan}
              >
                Confirm Investment
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Investments;
