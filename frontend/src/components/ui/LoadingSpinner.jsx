/**
 * Loading Spinner Component
 */

import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
};

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return (
    <Loader2
      className={clsx('animate-spin text-primary-600', sizes[size], className)}
    />
  );
};

export default LoadingSpinner;
