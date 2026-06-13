/**
 * Profile Page
 * View and update user profile information and password
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Save, Shield, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDate, getStatusBadgeClass } from '../utils/format';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || '',
      mobileNumber: user?.mobileNumber || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm();

  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data) => {
    setIsUpdating(true);
    try {
      const res = await api.auth.updateProfile(data);
      updateUser(res.data.data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setIsChangingPassword(true);
    try {
      await api.auth.changePassword(data);
      toast.success('Password updated successfully');
      resetPasswordForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage your account information and security settings
        </p>
      </div>

      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6 flex items-center gap-4 flex-wrap"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{user?.fullName}</h2>
          <p className="text-sm text-gray-400">{user?.email}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={getStatusBadgeClass(user?.accountStatus)}>
              {user?.accountStatus}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {formatDate(user?.createdAt)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Referral Code</p>
          <p className="font-bold text-primary-600 dark:text-primary-400">
            {user?.referralCode}
          </p>
        </div>
      </motion.div>

      {/* Profile Information */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-primary-600" />
          Personal Information
        </h3>

        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              icon={User}
              error={profileErrors.fullName?.message}
              {...registerProfile('fullName', {
                required: 'Full name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' },
                maxLength: { value: 50, message: 'Name cannot exceed 50 characters' },
              })}
            />

            <Input
              label="Mobile Number"
              icon={Phone}
              maxLength={10}
              error={profileErrors.mobileNumber?.message}
              {...registerProfile('mobileNumber', {
                required: 'Mobile number is required',
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: 'Mobile number must be 10 digits',
                },
              })}
            />
          </div>

          <Input label="Email Address" icon={Mail} value={user?.email || ''} disabled />
          <p className="text-xs text-gray-400 -mt-2">Email address cannot be changed</p>

          <Button type="submit" isLoading={isUpdating} icon={Save}>
            Save Changes
          </Button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" />
          Change Password
        </h3>

        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            icon={Lock}
            error={passwordErrors.oldPassword?.message}
            {...registerPassword('oldPassword', {
              required: 'Current password is required',
            })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              icon={Lock}
              error={passwordErrors.newPassword?.message}
              {...registerPassword('newPassword', {
                required: 'New password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
                pattern: {
                  value: /^(?=.*[A-Z])(?=.*[0-9]).*$/,
                  message: 'Must contain an uppercase letter and a number',
                },
              })}
            />

            <Input
              label="Confirm New Password"
              type="password"
              icon={Lock}
              error={passwordErrors.confirmPassword?.message}
              {...registerPassword('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === newPassword || 'Passwords do not match',
              })}
            />
          </div>

          <Button type="submit" variant="secondary" isLoading={isChangingPassword} icon={Shield}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
