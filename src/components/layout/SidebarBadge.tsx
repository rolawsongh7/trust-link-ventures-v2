import React from 'react';
import { cn } from '@/lib/utils';

interface SidebarBadgeProps {
  count: number;
  className?: string;
}

export const SidebarBadge: React.FC<SidebarBadgeProps> = ({ count, className }) => {
  if (count === 0) return null;

  return (
    <span 
      className={cn(
        "absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5",
        "flex items-center justify-center font-semibold shadow-lg",
        "animate-in zoom-in-50 duration-300",
        "ring-2 ring-slate-900",
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
