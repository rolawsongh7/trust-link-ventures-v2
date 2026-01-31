/**
 * Phase 3A: Commercial Signal Badges Component
 * 
 * Displays commercial intelligence signals for customers.
 * Informational only - no click actions.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw, TrendingUp, Zap, CreditCard } from 'lucide-react';
import { 
  type CommercialSignals,
  getSignalColor,
  getSignalLabel,
  getSignalTooltip,
} from '@/utils/commercialSignals';
import { cn } from '@/lib/utils';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface CommercialSignalBadgesProps {
  signals: CommercialSignals;
  variant?: 'default' | 'compact' | 'inline';
  showCreditCandidate?: boolean; // Controlled by super_admin check
  className?: string;
}

const SignalIcon: React.FC<{ signal: keyof CommercialSignals; className?: string }> = ({ 
  signal, 
  className 
}) => {
  const iconClass = cn('h-3 w-3', className);
  
  switch (signal) {
    case 'repeatBuyer':
      return <RefreshCw className={iconClass} />;
    case 'highValue':
      return <TrendingUp className={iconClass} />;
    case 'highFrequency':
      return <Zap className={iconClass} />;
    case 'creditCandidate':
      return <CreditCard className={iconClass} />;
  }
};

const SignalBadge: React.FC<{
  signal: keyof CommercialSignals;
  variant: 'default' | 'compact' | 'inline';
}> = ({ signal, variant }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 font-medium',
              getSignalColor(signal),
              variant === 'compact' && 'px-1.5 py-0 text-xs',
              variant === 'inline' && 'px-2 py-0.5 text-xs'
            )}
          >
            <SignalIcon signal={signal} />
            {variant !== 'compact' && getSignalLabel(signal)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getSignalTooltip(signal)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const CommercialSignalBadges: React.FC<CommercialSignalBadgesProps> = ({
  signals,
  variant = 'default',
  showCreditCandidate = false,
  className,
}) => {
  const { hasSuperAdminAccess } = useRoleAuth();
  
  const activeSignals: (keyof CommercialSignals)[] = [];
  
  if (signals.repeatBuyer) activeSignals.push('repeatBuyer');
  if (signals.highValue) activeSignals.push('highValue');
  if (signals.highFrequency) activeSignals.push('highFrequency');
  
  // Credit candidate only visible to super_admin
  if (signals.creditCandidate && showCreditCandidate && hasSuperAdminAccess) {
    activeSignals.push('creditCandidate');
  }
  
  if (activeSignals.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      'flex flex-wrap gap-1',
      variant === 'inline' && 'inline-flex',
      className
    )}>
      {activeSignals.map((signal) => (
        <SignalBadge key={signal} signal={signal} variant={variant} />
      ))}
    </div>
  );
};

/**
 * Single signal badge for inline use (e.g., in tables)
 */
interface SingleSignalBadgeProps {
  signal: keyof CommercialSignals;
  active: boolean;
  variant?: 'default' | 'compact';
}

export const SingleSignalBadge: React.FC<SingleSignalBadgeProps> = ({
  signal,
  active,
  variant = 'default',
}) => {
  if (!active) return null;
  
  return <SignalBadge signal={signal} variant={variant} />;
};

/**
 * Repeat Buyer indicator for order rows
 */
interface RepeatBuyerIndicatorProps {
  isRepeatBuyer: boolean;
  className?: string;
}

export const RepeatBuyerIndicator: React.FC<RepeatBuyerIndicatorProps> = ({
  isRepeatBuyer,
  className,
}) => {
  if (!isRepeatBuyer) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 px-1.5 py-0 text-xs font-medium',
              'bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400',
              className
            )}
          >
            <RefreshCw className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Repeat Buyer (2+ orders)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CommercialSignalBadges;
