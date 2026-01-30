import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Users, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export type AssignmentFilter = 'all' | 'mine' | 'unassigned';

interface AssignmentFiltersProps {
  value: AssignmentFilter;
  onChange: (filter: AssignmentFilter) => void;
  counts?: {
    all?: number;
    mine?: number;
    unassigned?: number;
  };
  className?: string;
}

/**
 * Filter buttons for assignment-based filtering:
 * - All: Show all items
 * - My Queue: Show items assigned to current user
 * - Unassigned: Show items without assignee
 */
export const AssignmentFilters: React.FC<AssignmentFiltersProps> = ({
  value,
  onChange,
  counts,
  className = '',
}) => {
  const { user } = useAuth();

  const filters: { key: AssignmentFilter; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'mine', label: 'My Queue', icon: <User className="h-3.5 w-3.5" /> },
    { key: 'unassigned', label: 'Unassigned', icon: <UserCircle className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {filters.map(({ key, label, icon }) => {
        const isActive = value === key;
        const count = counts?.[key];

        return (
          <Button
            key={key}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(key)}
            className={`gap-1.5 h-8 ${isActive ? 'bg-secondary' : ''}`}
          >
            {icon}
            <span>{label}</span>
            {count !== undefined && (
              <Badge 
                variant={isActive ? 'default' : 'secondary'} 
                className="ml-1 h-5 px-1.5 text-[10px]"
              >
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
};

/**
 * Helper function to filter items by assignment
 */
export function filterByAssignment<T extends { assigned_to?: string | null }>(
  items: T[],
  filter: AssignmentFilter,
  currentUserId?: string
): T[] {
  switch (filter) {
    case 'mine':
      if (!currentUserId) return [];
      return items.filter(item => item.assigned_to === currentUserId);
    case 'unassigned':
      return items.filter(item => !item.assigned_to);
    case 'all':
    default:
      return items;
  }
}

/**
 * Helper to count items by assignment
 */
export function countByAssignment<T extends { assigned_to?: string | null }>(
  items: T[],
  currentUserId?: string
): { all: number; mine: number; unassigned: number } {
  return {
    all: items.length,
    mine: currentUserId ? items.filter(item => item.assigned_to === currentUserId).length : 0,
    unassigned: items.filter(item => !item.assigned_to).length,
  };
}
