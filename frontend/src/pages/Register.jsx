/**
 * Register Page
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, Lock, Gift, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Register = () => {
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      referralCode: refCode,
    },
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    const { confirmPassword, ...payload } = data;
    if (!payload.referralCode) delete payload.referralCode;
    await registerUser(payload);
    setIsSubmitting(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Create your account
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Start your investment journey today
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          icon={User}
          placeholder="John Doe"
          error={errors.fullName?.message}
          {...register('fullName', {
            required: 'Full name is required',
            minLength: { value: 2, message: 'Name must be at least 2 characters' },
            maxLength: { value: 50, message: 'Name cannot exceed 50 characters' },
          })}
        />

        <Input
          label="Email Address"
          type="email"
          icon={Mail}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^\S+@\S+$/i,
              message: 'Enter a valid email address',
            },
          })}
        />

        <Input
          label="Mobile Number"
          icon={Phone}
          placeholder="9876543210"
          maxLength={10}
          error={errors.mobileNumber?.message}
          {...register('mobileNumber', {
            required: 'Mobile number is required',
            pattern: {
              value: /^[0-9]{10}$/,
              message: 'Mobile number must be 10 digits',
            },
          })}
        />

        <Input
          label="Password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 6, message: 'Password must be at least 6 characters' },
            pattern: {
              value: /^(?=.*[A-Z])(?=.*[0-9]).*$/,
              message: 'Must contain an uppercase letter and a number',
            },
          })}
        />

        <Input
          label="Confirm Password"
          type="password"
          icon={Lock}
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (value) => value === password || 'Passwords do not match',
          })}
        />

        <Input
          label="Referral Code (Optional)"
          icon={Gift}
          placeholder="ABC123"
          error={errors.referralCode?.message}
          {...register('referralCode')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} icon={UserPlus}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Register;
