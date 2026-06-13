/**
 * Navbar Component
 * Top navigation bar with theme toggle, notifications, and user menu
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  LogOut,
  User,
  ChevronDown,
  TrendingUp,
  Users,
  Wallet,
  RefreshCcw,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency } from '../../utils/format';
import { getInitials } from '../../utils/helpers';

const notificationIcons = {
  roi_credit: { icon: TrendingUp, color: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' },
  referral_income: { icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
  investment: { icon: Wallet, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  withdrawal: { icon: Wallet, color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
  refund: { icon: RefreshCcw, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
};

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = getInitials(user?.fullName);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-700 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-400">Welcome back,</p>
          <p className="font-semibold text-gray-900 dark:text-white leading-tight">
            {user?.fullName || 'User'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 max-w-[90vw] card p-0 animate-fade-in shadow-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-700">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  Notifications
                </p>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Inbox className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const config = notificationIcons[notif.type] || notificationIcons.investment;
                    const Icon = config.icon;
                    return (
                      <button
                        key={notif.id}
                        onClick={() => markAsRead(notif.id)}
                        className={clsx(
                          'w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors',
                          !notif.isRead && 'bg-primary-50/50 dark:bg-primary-900/10'
                        )}
                      >
                        <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', config.color)}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                              +{formatCurrency(notif.amount)}
                            </span>
                            <span className="text-xs text-gray-400">{notif.timeAgo}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => {
                  setNotifOpen(false);
                  navigate('/wallet');
                }}
                className="w-full text-center py-2.5 text-sm font-medium text-primary-600 hover:text-primary-700 border-t border-gray-100 dark:border-dark-700"
              >
                View all transactions
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 card p-2 animate-fade-in shadow-lg">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
