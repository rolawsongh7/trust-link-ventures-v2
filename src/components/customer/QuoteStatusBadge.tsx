import React from 'react';
import { getQuoteStatusConfig } from '@/utils/quoteStatusConfig';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface QuoteStatusBadgeProps {
  status: string;
  variant?: 'default' | 'compact';
  showTooltip?: boolean;
}

export const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({
  status,
  variant = 'default',
  showTooltip = true,
}) => {
  const config = getQuoteStatusConfig(status);
  const Icon = config.icon;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        config.className,
        variant === 'compact' 
          ? 'px-2 py-0.5 text-xs' 
          : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={cn(
        'flex-shrink-0',
        variant === 'compact' ? 'h-3 w-3' : 'h-3.5 w-3.5'
      )} />
      <span>{config.customerLabel}</span>
    </span>
  );

  if (!showTooltip || !config.customerHint) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.customerHint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
