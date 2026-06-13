/**
 * API Service
 * Centralized API client with interceptors for authentication and error handling
 */

import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || 10000);

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token to headers
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await apiClient.post('/auth/refresh-token', {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;

          // Update tokens
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        toast.error('Session expired. Please login again.');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      toast.error(error.response.data?.message || 'Access denied');
    } else if (error.response?.status === 404) {
      toast.error(error.response.data?.message || 'Resource not found');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

/**
 * API endpoints
 */
const api = {
  // Auth endpoints
  auth: {
    register: (data) => apiClient.post('/auth/register', data),
    login: (data) => apiClient.post('/auth/login', data),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/profile'),
    updateProfile: (data) => apiClient.put('/auth/profile', data),
    changePassword: (data) => apiClient.post('/auth/change-password', data),
  },

  // Investment endpoints
  investments: {
    create: (data) => apiClient.post('/investments/create', data),
    getAll: (params) => apiClient.get('/investments/my-investments', { params }),
    getDetails: (id) => apiClient.get(`/investments/${id}`),
    cancel: (id, data) => apiClient.post(`/investments/${id}/cancel`, data),
    getSummary: () => apiClient.get('/investments/summary'),
    getPlans: () => apiClient.get('/investments/plans'),
    calculateROI: (data) => apiClient.post('/investments/calculate-roi', data),
  },

  // Dashboard endpoints
  dashboard: {
    getSummary: () => apiClient.get('/dashboard/summary'),
    getROIStats: () => apiClient.get('/dashboard/roi-stats'),
    getReferralStats: () => apiClient.get('/dashboard/referral-stats'),
    getMonthlyBreakdown: (params) =>
      apiClient.get('/dashboard/monthly-breakdown', { params }),
    getAnalytics: (params) => apiClient.get('/dashboard/analytics', { params }),
    getTransactionHistory: (params) =>
      apiClient.get('/dashboard/transaction-history', { params }),
  },

  // Referral endpoints
  referrals: {
    getDirect: (params) => apiClient.get('/referrals/direct', { params }),
    getTree: (params) => apiClient.get('/referrals/tree', { params }),
    getIncomeHistory: (params) =>
      apiClient.get('/referrals/income-history', { params }),
    getSummary: () => apiClient.get('/referrals/summary'),
    getStatistics: () => apiClient.get('/referrals/statistics'),
    getLink: () => apiClient.get('/referrals/link'),
    getLevels: () => apiClient.get('/referrals/levels'),
  },
};

export default api;
