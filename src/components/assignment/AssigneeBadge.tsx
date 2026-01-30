import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { User, UserCircle } from 'lucide-react';

interface AssigneeBadgeProps {
  assigneeId?: string | null;
  assigneeName?: string | null;
  assigneeEmail?: string | null;
  assigneeAvatarUrl?: string | null;
  assigneeRole?: string | null;
  size?: 'sm' | 'md';
  showUnassigned?: boolean;
}

/**
 * Displays the assigned staff member with avatar and name.
 * Shows "Unassigned" state when no assignee is set.
 */
export const AssigneeBadge: React.FC<AssigneeBadgeProps> = ({
  assigneeId,
  assigneeName,
  assigneeEmail,
  assigneeAvatarUrl,
  assigneeRole,
  size = 'sm',
  showUnassigned = true,
}) => {
  if (!assigneeId) {
    if (!showUnassigned) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-muted-foreground border-dashed gap-1 cursor-default"
            >
              <UserCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
              <span className={size === 'sm' ? 'text-xs' : 'text-sm'}>Unassigned</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>No staff member assigned</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const displayName = assigneeName || assigneeEmail?.split('@')[0] || 'Unknown';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = assigneeRole 
    ? assigneeRole.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-default">
            <Avatar className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'}>
              {assigneeAvatarUrl ? (
                <AvatarImage src={assigneeAvatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className={`text-[10px] bg-primary/10 text-primary ${size === 'sm' ? 'text-[8px]' : ''}`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className={`font-medium text-foreground ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {displayName}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5">
            <div className="font-medium">{displayName}</div>
            {assigneeEmail && <div className="text-xs text-muted-foreground">{assigneeEmail}</div>}
            {roleLabel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {roleLabel}
              </Badge>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
