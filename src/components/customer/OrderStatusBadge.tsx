import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrderStatusConfig } from '@/utils/orderStatusConfig';
import { cn } from '@/lib/utils';
import { getBlockerReason } from '@/utils/orderStatusErrors';

interface OrderStatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
  className?: string;
  // Optional order context for blocker reasons
  order?: {
    payment_status?: 'unpaid' | 'partially_paid' | 'fully_paid' | 'overpaid' | null;
    balance_remaining?: number | null;
    delivery_address_id?: string | null;
    currency?: string;
  };
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  variant = 'default',
  showTooltip = true,
  className = '',
  order
}) => {
  const config = getOrderStatusConfig(status);
  const Icon = config.icon;
  
  // Get blocker reason if order context is provided
  const blockerReason = order ? getBlockerReason({ status, ...order }) : null;
  
  const badge = (
    <span 
      className={cn(
        'inline-flex items-center gap-1 justify-center rounded-full font-medium transition-all',
        variant === 'compact' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className,
        className
      )}
    >
      <Icon className={cn(
        variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5',
        status === 'processing' && 'animate-spin'
      )} />
      {config.customerLabel}
    </span>
  );

  // Don't show tooltip if disabled or no hint/blocker
  if (!showTooltip || (!config.customerHint && !blockerReason)) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent 
          side="top"
          className="max-w-xs bg-popover border-border shadow-lg"
        >
          <p className="font-medium text-foreground">{config.customerLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">{config.customerHint}</p>
          {blockerReason && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
              ⏳ {blockerReason}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
