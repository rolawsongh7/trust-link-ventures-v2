/**
 * Phase 5.1: Trust Tier Badge Component
 * 
 * Displays customer trust tier with appropriate styling.
 * Shows eligibilities in tooltip.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Lock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type TrustTier,
  getTrustTierConfig,
  getTrustTierLabel,
  getTrustTierDescription,
  getTrustTierEligibilities,
} from '@/utils/trustHelpers';

interface TrustBadgeProps {
  tier: TrustTier;
  variant?: 'default' | 'compact' | 'full';
  showTooltip?: boolean;
  hasOverride?: boolean;
  className?: string;
}

const TierIcon: React.FC<{ tier: TrustTier; className?: string }> = ({ tier, className }) => {
  const config = getTrustTierConfig(tier);
  const iconClass = cn('h-3.5 w-3.5', config.iconColor, className);

  switch (tier) {
    case 'preferred':
      return <Star className={iconClass} />;
    case 'trusted':
      return <ShieldCheck className={iconClass} />;
    case 'verified':
      return <Shield className={iconClass} />;
    case 'restricted':
      return <ShieldX className={iconClass} />;
    case 'new':
    default:
      return <ShieldAlert className={iconClass} />;
  }
};

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  tier,
  variant = 'default',
  showTooltip = true,
  hasOverride = false,
  className,
}) => {
  const config = getTrustTierConfig(tier);
  const eligibilities = getTrustTierEligibilities(tier);

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border',
        config.bgColor,
        config.color,
        config.borderColor,
        variant === 'compact' && 'px-1.5 py-0 text-xs',
        variant === 'full' && 'px-3 py-1',
        className
      )}
    >
      <TierIcon tier={tier} />
      {variant !== 'compact' && getTrustTierLabel(tier)}
      {hasOverride && <Lock className="h-3 w-3 ml-0.5 opacity-70" />}
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
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <div>
              <p className="font-medium">{getTrustTierLabel(tier)} Trust Tier</p>
              <p className="text-xs text-muted-foreground">{getTrustTierDescription(tier)}</p>
            </div>
            
            {eligibilities.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Eligibilities:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {eligibilities.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {hasOverride && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Manual override active
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TrustBadge;
