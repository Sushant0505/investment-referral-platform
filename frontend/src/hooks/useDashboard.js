/**
 * Dashboard Hooks
 * React Query hooks for dashboard data
 */

import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboardSummary = () => {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.dashboard.getSummary();
      return res.data.data;
    },
  });
};

export const useAnalytics = (type = 'roi', days = 30) => {
  return useQuery({
    queryKey: ['analytics', type, days],
    queryFn: async () => {
      const res = await api.dashboard.getAnalytics({ type, days });
      return res.data.data;
    },
  });
};

export const useTransactionHistory = (params = {}) => {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: async () => {
      const res = await api.dashboard.getTransactionHistory(params);
      return res.data;
    },
  });
};

export const useReferralStats = () => {
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const res = await api.dashboard.getReferralStats();
      return res.data.data;
    },
  });
};
