/**
 * Auth Layout
 * Layout wrapper for login/register pages with branding panel
 */

import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, Users, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: TrendingUp,
    title: 'Smart Investments',
    desc: 'Earn daily ROI with our curated investment plans',
  },
  {
    icon: Users,
    title: 'Referral Rewards',
    desc: 'Earn up to 5 levels of referral commission',
  },
  {
    icon: ShieldCheck,
    title: 'Bank-Grade Security',
    desc: 'Your funds and data are protected with industry standards',
  },
];

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-dark-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white rounded-full"></div>
          <div className="absolute bottom-10 left-10 w-60 h-60 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">InvestPro</span>
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl font-bold text-white mb-4 leading-tight"
          >
            Grow your wealth with smart investments & referrals
          </motion.h1>
          <p className="text-primary-100 text-lg">
            Join thousands of investors earning daily returns and building passive income through
            our referral network.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="flex items-start gap-4"
            >
              <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">{title}</p>
                <p className="text-primary-100 text-sm">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">InvestPro</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
