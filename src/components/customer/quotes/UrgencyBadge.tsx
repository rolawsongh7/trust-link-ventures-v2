import React from 'react';
import { AlertCircle, Clock, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

type UrgencyType = 'low' | 'medium' | 'high';

interface UrgencyBadgeProps {
  urgency: UrgencyType | string;
  variant?: 'default' | 'compact';
  className?: string;
}

const urgencyConfig: Record<UrgencyType, { 
  label: string; 
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  low: {
    label: 'Low',
    className: 'bg-[hsl(var(--tl-info-bg))] text-[hsl(var(--tl-info-text))] border border-[hsl(var(--tl-maritime-300))] dark:bg-[hsl(var(--tl-info-bg))] dark:text-[hsl(var(--tl-info-text))]',
    icon: Clock
  },
  medium: {
    label: 'Medium',
    className: 'bg-[hsl(var(--tl-warning-bg))] text-[hsl(var(--tl-warning-text))] border border-[hsl(var(--tl-warning))] dark:bg-[hsl(var(--tl-warning-bg))] dark:text-[hsl(var(--tl-warning-text))]',
    icon: AlertCircle
  },
  high: {
    label: 'High',
    className: 'bg-[hsl(var(--tl-danger-bg))] text-[hsl(var(--tl-danger-text))] border border-[hsl(var(--tl-danger))] dark:bg-[hsl(var(--tl-danger-bg))] dark:text-[hsl(var(--tl-danger-text))]',
    icon: Flame
  }
};

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency,
  variant = 'default',
  className = ''
}) => {
  const config = urgencyConfig[urgency as UrgencyType] || urgencyConfig.medium;
  const Icon = config.icon;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 justify-center rounded-full font-medium transition-all',
        variant === 'compact' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      <Icon className={cn(variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {config.label}
    </span>
  );
};
