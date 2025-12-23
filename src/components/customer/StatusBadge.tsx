import React from 'react';
import { Clock, FileCheck, CheckCircle, XCircle, Package, Truck, CheckCircle2, Ban, FileText, HelpCircle } from 'lucide-react';

type StatusType = 
  // Quote-specific statuses
  | 'pending' | 'processing' | 'quoted' | 'approved' | 'rejected' | 'completed' | 'quote' | 'converted'
  // Order statuses
  | 'order_processing' | 'shipped' | 'delivered' | 'canceled'
  // General
  | 'draft';

interface StatusBadgeProps {
  status: StatusType;
  variant?: 'default' | 'compact';
  className?: string;
}

const statusConfig: Record<StatusType, { 
  label: string; 
  className: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: 'Pending Review',
    className: 'bg-[hsl(var(--tl-warning-bg))] text-[hsl(var(--tl-warning-text))] border border-[hsl(var(--tl-warning))]',
    icon: Clock
  },
  processing: {
    label: 'Quote in Progress',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-300))]',
    icon: Clock
  },
  quoted: {
    label: 'Quote Available',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-400))]',
    icon: FileCheck
  },
  approved: {
    label: 'Accepted',
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    icon: CheckCircle
  },
  rejected: {
    label: 'Declined',
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))]',
    icon: XCircle
  },
  completed: {
    label: 'Completed',
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    icon: CheckCircle2
  },
  converted: {
    label: 'Order Created',
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    icon: Package
  },
  quote: {
    label: 'Quote',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-400))]',
    icon: FileText
  },
  order_processing: {
    label: 'Processing',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-400))]',
    icon: Package
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-500))]',
    icon: Truck
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-[hsl(var(--tl-success-bg))] text-[hsl(var(--tl-success-text))] border border-[hsl(var(--tl-success))]',
    icon: CheckCircle2
  },
  canceled: {
    label: 'Canceled',
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))]',
    icon: Ban
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-600',
    icon: HelpCircle
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'default',
  className = ''
}) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 justify-center rounded-full font-medium transition-all
                  ${variant === 'compact' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
                  ${config.className}
                  ${className}`}
    >
      {Icon && <Icon className={variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {config.label}
    </span>
  );
};
