// Benefits Badge Component
// Phase 3B: Compact visual indicator for customer benefits

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getBenefitLabel,
  getBenefitIcon,
  getBenefitBadgeColor,
  getEnabledBenefits,
  type CustomerBenefit,
} from '@/utils/benefitHelpers';

interface BenefitsBadgeProps {
  benefits: CustomerBenefit[];
  compact?: boolean;
  showTooltip?: boolean;
}

export function BenefitsBadge({ benefits, compact = false, showTooltip = true }: BenefitsBadgeProps) {
  const enabledBenefits = getEnabledBenefits(benefits);
  
  if (enabledBenefits.length === 0) {
    return null;
  }

  // Compact mode: show count badge
  if (compact) {
    const content = (
      <Badge variant="secondary" className="gap-1 text-xs">
        {enabledBenefits.length} benefit{enabledBenefits.length > 1 ? 's' : ''}
      </Badge>
    );

    if (!showTooltip) return content;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              {enabledBenefits.map((benefit) => {
                const Icon = getBenefitIcon(benefit.benefit_type);
                return (
                  <div key={benefit.id} className="flex items-center gap-2 text-sm">
                    <Icon className="h-3 w-3" />
                    <span>{getBenefitLabel(benefit.benefit_type)}</span>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full mode: show individual badges
  return (
    <div className="flex flex-wrap gap-1">
      {enabledBenefits.map((benefit) => {
        const Icon = getBenefitIcon(benefit.benefit_type);
        const badge = (
          <Badge
            key={benefit.id}
            className={`gap-1 ${getBenefitBadgeColor(benefit.benefit_type)}`}
          >
            <Icon className="h-3 w-3" />
            {getBenefitLabel(benefit.benefit_type)}
          </Badge>
        );

        if (!showTooltip) return badge;

        return (
          <TooltipProvider key={benefit.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                {badge}
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{getBenefitLabel(benefit.benefit_type)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// Priority Badge specifically for Operations Hub
export function PriorityBadge({ benefits }: { benefits: CustomerBenefit[] }) {
  const hasPriority = benefits.some(
    b => b.benefit_type === 'priority_processing' && b.enabled
  );

  if (!hasPriority) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1">
            ⚡ Priority
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Priority Processing enabled</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
