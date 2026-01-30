import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { calculateSLA, type SLAStatus } from '@/utils/slaHelpers';
import type { Order } from '@/hooks/useOrdersQuery';
import { cn } from '@/lib/utils';

interface SLABadgeProps {
  order: Order;
  showReason?: boolean;
  compact?: boolean;
}

const statusConfig: Record<SLAStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  on_track: {
    label: 'On Track',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20',
  },
  at_risk: {
    label: 'At Risk',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20',
  },
  breached: {
    label: 'Breached',
    icon: AlertTriangle,
    className: 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20',
  },
};

export function SLABadge({ order, showReason = false, compact = false }: SLABadgeProps) {
  const sla = calculateSLA(order);
  const config = statusConfig[sla.status];
  const Icon = config.icon;
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'font-medium transition-colors',
        config.className,
        compact && 'px-1.5 py-0.5 text-xs'
      )}
    >
      <Icon className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {compact ? sla.daysInStage + 'd' : config.label}
    </Badge>
  );
  
  if (showReason || compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{config.label}</p>
          <p className="text-muted-foreground text-xs">{sla.reason}</p>
          {sla.daysInStage > 0 && (
            <p className="text-muted-foreground text-xs mt-1">
              {sla.daysInStage} day{sla.daysInStage !== 1 ? 's' : ''} in current stage
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
  
  return badge;
}
