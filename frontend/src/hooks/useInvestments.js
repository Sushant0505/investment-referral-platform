/**
 * Investment Hooks
 * React Query hooks for investment data and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

export const useInvestments = (params = {}) => {
  return useQuery({
    queryKey: ['investments', params],
    queryFn: async () => {
      const res = await api.investments.getAll(params);
      return res.data;
    },
  });
};

export const useInvestmentPlans = () => {
  return useQuery({
    queryKey: ['investment-plans'],
    queryFn: async () => {
      const res = await api.investments.getPlans();
      return res.data.data;
    },
  });
};

export const useInvestmentSummary = () => {
  return useQuery({
    queryKey: ['investment-summary'],
    queryFn: async () => {
      const res = await api.investments.getSummary();
      return res.data.data;
    },
  });
};

export const useCreateInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.investments.create(data),
    onSuccess: () => {
      toast.success('Investment created successfully!');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create investment');
    },
  });
};

export const useCancelInvestment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }) => api.investments.cancel(id, { reason }),
    onSuccess: () => {
      toast.success('Investment cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investment-summary'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel investment');
    },
  });
};
