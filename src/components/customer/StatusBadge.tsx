import React from 'react';

type StatusType = 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled' | 'draft' | 'approved' | 'quote';

interface StatusBadgeProps {
  status: StatusType;
  variant?: 'default' | 'compact';
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-800/40 dark:text-amber-400'
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-800/40 dark:text-blue-400'
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-800/40 dark:text-sky-400'
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-100 text-green-700 dark:bg-green-800/40 dark:text-green-400'
  },
  canceled: {
    label: 'Canceled',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-800/40 dark:text-rose-400'
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-400'
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-400'
  },
  quote: {
    label: 'Quote',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-800/40 dark:text-violet-400'
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  className = ''
}) => {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span 
      className={`inline-flex items-center justify-center
                  rounded-full font-medium
                  ${variant === 'compact' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'}
                  ${config.className}
                  ${className}`}
    >
      {config.label}
    </span>
  );
};
