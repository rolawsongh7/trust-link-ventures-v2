import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CommunicationsEmptyStateProps {
  type: 'no-threads' | 'no-results' | 'no-selection';
  searchTerm?: string;
  onCreateNew?: () => void;
}

export const CommunicationsEmptyState: React.FC<CommunicationsEmptyStateProps> = ({
  type,
  searchTerm,
  onCreateNew
}) => {
  const configs = {
    'no-threads': {
      icon: Inbox,
      title: 'No communications yet',
      description: 'Start logging your first customer interaction',
      action: onCreateNew ? (
        <Button onClick={onCreateNew} className="mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Log Communication
        </Button>
      ) : null,
    },
    'no-results': {
      icon: Search,
      title: 'No matching conversations',
      description: searchTerm 
        ? `No results found for "${searchTerm}"` 
        : 'Try adjusting your search or filters',
      action: null,
    },
    'no-selection': {
      icon: MessageSquare,
      title: 'Select a conversation',
      description: 'Choose a thread from the list to view details',
      action: null,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center"
    >
      {/* Animated icon container */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-6"
      >
        {/* Background circles */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl scale-150" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-muted/50 to-transparent animate-pulse" />
        
        {/* Icon container */}
        <div className={cn(
          "relative rounded-2xl p-6 shadow-lg",
          "bg-gradient-to-br from-muted/80 to-muted/40",
          "border border-border/50"
        )}>
          <Icon className="h-12 w-12 text-muted-foreground/70" />
        </div>
        
        {/* Decorative dots */}
        <motion.div
          animate={{ 
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-primary/50"
        />
        <motion.div
          animate={{ 
            y: [0, 8, 0],
            opacity: [0.3, 0.8, 0.3] 
          }}
          transition={{ 
            duration: 2.5, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
          className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-accent/50"
        />
      </motion.div>

      {/* Text content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h3 className="text-lg font-semibold text-foreground">
          {config.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {config.description}
        </p>
      </motion.div>

      {/* Action button */}
      {config.action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {config.action}
        </motion.div>
      )}
    </motion.div>
  );
};
