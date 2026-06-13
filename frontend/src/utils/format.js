/**
 * Formatting Utilities
 */

export const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatNumber = (num = 0) => {
  return new Intl.NumberFormat('en-IN').format(num || 0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatPercent = (value = 0) => {
  return `${value}%`;
};

export const getStatusBadgeClass = (status) => {
  const map = {
    active: 'badge-success',
    completed: 'badge-info',
    cancelled: 'badge-danger',
    pending: 'badge-warning',
    credited: 'badge-success',
    failed: 'badge-danger',
    reversed: 'badge-warning',
  };
  return map[status] || 'badge-info';
};

export const capitalize = (str = '') => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
