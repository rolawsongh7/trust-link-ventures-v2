import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { RevisionStatus } from '@/hooks/useQuoteRevisions';
import { cn } from '@/lib/utils';

interface RevisionStatusBadgeProps {
  status: RevisionStatus;
  className?: string;
}

const statusConfig: Record<RevisionStatus, {
  label: string;
  icon: React.ReactNode;
  className: string;
}> = {
  submitted: {
    label: 'Pending Review',
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
  },
  reviewing: {
    label: 'Under Review',
    icon: <Eye className="h-3 w-3" />,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  },
  revised_sent: {
    label: 'Revised Quote Sent',
    icon: <RefreshCw className="h-3 w-3" />,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  },
  resolved: {
    label: 'Resolved',
    icon: <CheckCircle className="h-3 w-3" />,
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  rejected: {
    label: 'Cancelled',
    icon: <XCircle className="h-3 w-3" />,
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  },
};

export const RevisionStatusBadge: React.FC<RevisionStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = statusConfig[status] || statusConfig.submitted;

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};
