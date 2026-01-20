import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RelatedEntityCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  onView: () => void;
  variant?: 'compact' | 'panel';
  className?: string;
}

export const RelatedEntityCard: React.FC<RelatedEntityCardProps> = ({
  title,
  value,
  subValue,
  icon: Icon,
  onView,
  variant = 'compact',
  className,
}) => {
  if (variant === 'panel') {
    return (
      <div className={cn(
        "bg-muted/50 border rounded-lg p-4",
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="font-medium">{value}</p>
              {subValue && (
                <p className="text-xs text-muted-foreground">{subValue}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            className="min-h-[44px] min-w-[44px] gap-2"
            aria-label={`View ${title}: ${value}`}
          >
            <ExternalLink className="h-4 w-4" />
            View
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onView}
      className={cn(
        "min-h-[44px] gap-2 justify-start",
        className
      )}
      aria-label={`View ${title}: ${value}`}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{value}</span>
    </Button>
  );
};
