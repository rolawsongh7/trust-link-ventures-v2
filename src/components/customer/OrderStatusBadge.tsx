import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrderStatusConfig } from '@/utils/orderStatusConfig';
import { cn } from '@/lib/utils';

interface OrderStatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
  className?: string;
}

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  variant = 'default',
  showTooltip = true,
  className = ''
}) => {
  const config = getOrderStatusConfig(status);
  const Icon = config.icon;
  
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

  if (!showTooltip || !config.customerHint) {
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
