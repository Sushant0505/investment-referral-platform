/**
 * Notification Context
 * Manages in-app notification feed (read/unread state, generation from activity)
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { timeAgo } from '../utils/helpers';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'readNotificationIds';

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Pull recent transactions to surface as notifications
  const { data, refetch } = useQuery({
    queryKey: ['notifications-feed'],
    queryFn: async () => {
      const res = await api.dashboard.getTransactionHistory({ page: 1, limit: 10 });
      return res.data.data || [];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 60000 : false, // refresh every minute
    retry: false,
  });

  const notifications = (data || []).map((tx) => ({
    id: tx._id,
    title: formatTitle(tx.transactionType),
    message: tx.description,
    amount: tx.amount,
    type: tx.transactionType,
    date: tx.processedAt,
    timeAgo: timeAgo(tx.processedAt),
    isRead: readIds.includes(tx._id),
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback((id) => {
    setReadIds((prev) => {
      const updated = [...new Set([...prev, id])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const allIds = [...new Set([...prev, ...notifications.map((n) => n.id)])];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
      return allIds;
    });
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch,
  };

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
};

function formatTitle(type) {
  const titles = {
    roi_credit: 'ROI Credited',
    referral_income: 'Referral Income',
    investment: 'Investment Created',
    withdrawal: 'Withdrawal Processed',
    deposit: 'Deposit Received',
    refund: 'Refund Issued',
    adjustment: 'Account Adjustment',
  };
  return titles[type] || 'Account Activity';
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
