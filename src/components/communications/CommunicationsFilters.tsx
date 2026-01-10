import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, Users, MessageSquare, Inbox, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface FilterOption {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

interface CommunicationsFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    all: number;
    unread: number;
    contact_form: number;
    email: number;
    call: number;
    meeting: number;
  };
}

export const CommunicationsFilters: React.FC<CommunicationsFiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const filters: FilterOption[] = [
    { id: 'all', label: 'All', icon: Inbox, count: counts.all },
    { id: 'unread', label: 'Unread', icon: Mail, count: counts.unread },
    { id: 'contact_form', label: 'Contact Forms', icon: FileText, count: counts.contact_form },
    { id: 'email', label: 'Emails', icon: Mail, count: counts.email },
    { id: 'call', label: 'Calls', icon: Phone, count: counts.call },
    { id: 'meeting', label: 'Meetings', icon: Users, count: counts.meeting },
  ];

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          
          return (
            <motion.button
              key={filter.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                "border shadow-sm",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-md" 
                  : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground hover:border-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{filter.label}</span>
              {filter.count !== undefined && filter.count > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "outline"}
                  className={cn(
                    "ml-1 h-5 min-w-[1.25rem] px-1.5 text-xs font-semibold",
                    isActive 
                      ? "bg-primary-foreground/20 text-primary-foreground border-0" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {filter.count}
                </Badge>
              )}
              
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="activeFilterIndicator"
                  className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-2" />
    </ScrollArea>
  );
};
