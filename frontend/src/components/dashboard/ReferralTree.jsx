/**
 * ReferralTree Component
 * Displays referral hierarchy with expand/collapse functionality
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, User, Users } from 'lucide-react';
import clsx from 'clsx';
import { formatDate, getStatusBadgeClass } from '../../utils/format';

const levelColors = [
  'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
];

const TreeNode = ({ node, isRoot = false }) => {
  const [expanded, setExpanded] = useState(isRoot);
  const hasChildren = node.children && node.children.length > 0;
  const colorClass = levelColors[(node.level - 1) % levelColors.length];

  return (
    <div className="select-none">
      <div
        className={clsx(
          'flex items-center gap-2 py-2 px-3 rounded-xl transition-colors',
          'hover:bg-gray-50 dark:hover:bg-dark-700',
          hasChildren && 'cursor-pointer'
        )}
        onClick={() => hasChildren && setExpanded((p) => !p)}
      >
        {hasChildren ? (
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </motion.div>
        ) : (
          <span className="w-4 h-4 inline-block" />
        )}

        <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
          <User className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
            {node.fullName}
            {!isRoot && (
              <span className="ml-2 badge bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-300">
                L{node.level - 1}
              </span>
            )}
          </p>
          <p className="text-xs text-gray-400 truncate">{node.email}</p>
        </div>

        {node.accountStatus && (
          <span className={getStatusBadgeClass(node.accountStatus)}>{node.accountStatus}</span>
        )}

        {hasChildren && (
          <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <Users className="w-3 h-3" />
            {node.children.length}
          </span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden ml-6 pl-3 border-l-2 border-gray-100 dark:border-dark-700"
          >
            {node.children.map((child) => (
              <TreeNode key={child._id} node={child} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReferralTree = ({ tree }) => {
  if (!tree) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p>No referral data available</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <TreeNode node={tree} isRoot />
    </div>
  );
};

export default ReferralTree;
