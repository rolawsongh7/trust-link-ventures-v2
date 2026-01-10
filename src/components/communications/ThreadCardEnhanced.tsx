import React from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageSquare, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ThreadCardEnhancedProps {
  thread: {
    id: string;
    subject: string;
    messageCount: number;
    latestMessage: {
      content: string;
      communication_date: string;
      communication_type: string;
      direction: string;
    };
    customer?: {
      company_name: string;
      contact_name?: string;
    };
    hasUnread?: boolean;
  };
  isSelected?: boolean;
  onClick: () => void;
}

export const ThreadCardEnhanced: React.FC<ThreadCardEnhancedProps> = ({ 
  thread, 
  isSelected,
  onClick 
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-3.5 w-3.5" />;
      case 'call': 
      case 'phone': return <Phone className="h-3.5 w-3.5" />;
      case 'meeting': return <Users className="h-3.5 w-3.5" />;
      default: return <MessageSquare className="h-3.5 w-3.5" />;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (!content || content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const relativeTime = formatDistanceToNow(new Date(thread.latestMessage.communication_date), { 
    addSuffix: true 
  });

  const isOutbound = thread.latestMessage.direction === 'outbound';

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer rounded-xl border p-4 transition-all duration-200",
        "glass-card",
        isSelected 
          ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20" 
          : "border-border/50 hover:border-primary/30 hover:shadow-lg",
        thread.hasUnread && "border-l-4 border-l-destructive"
      )}
    >
      {/* Unread indicator */}
      {thread.hasUnread && (
        <div className="absolute top-4 right-4">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
        </div>
      )}

      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className={cn(
          "h-10 w-10 flex-shrink-0 ring-2 transition-all",
          isSelected ? "ring-primary/30" : "ring-transparent"
        )}>
          <AvatarFallback className={cn(
            "text-xs font-bold",
            isOutbound ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent-foreground"
          )}>
            {getInitials(thread.customer?.company_name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-semibold text-sm line-clamp-1",
              thread.hasUnread ? "text-foreground" : "text-foreground/90"
            )}>
              {thread.subject}
            </h4>
            <Badge 
              variant="secondary" 
              className="flex-shrink-0 text-xs h-5 px-1.5 font-medium bg-muted/80"
            >
              {thread.messageCount}
            </Badge>
          </div>

          {/* Company Name */}
          <p className="text-xs text-muted-foreground font-medium truncate">
            {thread.customer?.company_name || 'Unknown Customer'}
          </p>

          {/* Message Preview */}
          <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
            {truncateContent(thread.latestMessage.content)}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{relativeTime}</span>
            </div>
            <div className="flex items-center gap-1">
              {getTypeIcon(thread.latestMessage.communication_type)}
              <span className="capitalize">{thread.latestMessage.communication_type}</span>
            </div>
            {isOutbound && (
              <Badge variant="outline" className="h-4 text-[10px] px-1.5 bg-primary/5 text-primary border-primary/20">
                Sent
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
