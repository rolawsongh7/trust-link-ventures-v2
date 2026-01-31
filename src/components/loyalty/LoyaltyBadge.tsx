/**
 * Phase 3A: Loyalty Tier Badge Component
 * 
 * Displays customer loyalty tier with appropriate styling.
 * Informational only - no click actions.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Medal, Trophy } from 'lucide-react';
import { 
  type LoyaltyTier, 
  getTierColor, 
  getTierLabel, 
  getTierDescription,
  getTierIconColor,
} from '@/utils/loyaltyHelpers';
import { cn } from '@/lib/utils';

interface LoyaltyBadgeProps {
  tier: LoyaltyTier;
  variant?: 'default' | 'compact' | 'full';
  showTooltip?: boolean;
  className?: string;
}

const TierIcon: React.FC<{ tier: LoyaltyTier; className?: string }> = ({ tier, className }) => {
  const iconClass = cn('h-3.5 w-3.5', getTierIconColor(tier), className);
  
  switch (tier) {
    case 'gold':
      return <Trophy className={iconClass} />;
    case 'silver':
      return <Medal className={iconClass} />;
    case 'bronze':
    default:
      return <Award className={iconClass} />;
  }
};

export const LoyaltyBadge: React.FC<LoyaltyBadgeProps> = ({
  tier,
  variant = 'default',
  showTooltip = true,
  className,
}) => {
  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        getTierColor(tier),
        variant === 'compact' && 'px-1.5 py-0 text-xs',
        variant === 'full' && 'px-3 py-1',
        className
      )}
    >
      <TierIcon tier={tier} />
      {variant !== 'compact' && getTierLabel(tier)}
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{getTierLabel(tier)} Tier</p>
          <p className="text-xs text-muted-foreground">{getTierDescription(tier)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Trusted Customer Badge - Only shown to Gold tier customers in customer portal
 */
interface TrustedCustomerBadgeProps {
  className?: string;
}

export const TrustedCustomerBadge: React.FC<TrustedCustomerBadgeProps> = ({ className }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 font-medium bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400',
              className
            )}
          >
            <Trophy className="h-3.5 w-3.5" />
            Trusted Customer
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">You're a valued member of our community</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LoyaltyBadge;
