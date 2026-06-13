/**
 * Referral Hooks
 * React Query hooks for referral data
 */

import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useReferralTree = (depth = 5) => {
  return useQuery({
    queryKey: ['referral-tree', depth],
    queryFn: async () => {
      const res = await api.referrals.getTree({ depth });
      return res.data.data;
    },
  });
};

export const useDirectReferrals = (params = {}) => {
  return useQuery({
    queryKey: ['direct-referrals', params],
    queryFn: async () => {
      const res = await api.referrals.getDirect(params);
      return res.data;
    },
  });
};

export const useReferralIncomeHistory = (params = {}) => {
  return useQuery({
    queryKey: ['referral-income-history', params],
    queryFn: async () => {
      const res = await api.referrals.getIncomeHistory(params);
      return res.data;
    },
  });
};

export const useReferralSummary = () => {
  return useQuery({
    queryKey: ['referral-summary'],
    queryFn: async () => {
      const res = await api.referrals.getSummary();
      return res.data.data;
    },
  });
};

export const useReferralLink = () => {
  return useQuery({
    queryKey: ['referral-link'],
    queryFn: async () => {
      const res = await api.referrals.getLink();
      return res.data.data;
    },
  });
};
