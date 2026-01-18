import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock, Mail, Phone, Users, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Communication {
  id: string;
  subject: string;
  content: string;
  communication_type: string;
  direction: 'inbound' | 'outbound';
  communication_date: string;
  contact_person?: string;
  read_at?: string | null;
}

export interface CommunicationThread {
  id: string;
  subject: string;
  latestMessage: string;
  latestDate: string;
  messageCount: number;
  unreadCount: number;
  communications: Communication[];
}

interface ThreadListItemProps {
  thread: CommunicationThread;
  isSelected: boolean;
  onClick: () => void;
}

export const ThreadListItem: React.FC<ThreadListItemProps> = ({ 
  thread, 
  isSelected,
  onClick 
}) => {
  const truncateMessage = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const hasUnread = thread.unreadCount > 0;
  const latestComm = thread.communications[thread.communications.length - 1];
  const isRecent = new Date(thread.latestDate).getTime() > Date.now() - 24 * 60 * 60 * 1000;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isSelected
          ? "bg-primary/10 border-primary shadow-lg"
          : hasUnread
          ? "bg-gradient-to-r from-primary/5 to-background border-primary/30 hover:border-primary/50"
          : "bg-background border-border/50 hover:border-border hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        <div className="flex-shrink-0 mt-1">
          {hasUnread ? (
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Subject and badge */}
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm line-clamp-1 flex-1",
              hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
            )}>
              {thread.subject}
            </h4>
            {thread.messageCount > 1 && (
              <Badge 
                variant="secondary" 
                className="flex-shrink-0 text-xs h-5 px-1.5 bg-muted"
              >
                {thread.messageCount}
              </Badge>
            )}
          </div>

          {/* Sender and type */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {getTypeIcon(latestComm?.communication_type || 'email')}
              <span>
                {latestComm?.direction === 'outbound' 
                  ? 'You' 
                  : (latestComm?.contact_person || 'Support Team')}
              </span>
            </div>
          </div>

          {/* Preview */}
          <p className={cn(
            "text-xs line-clamp-2",
            hasUnread ? "text-foreground/80" : "text-muted-foreground"
          )}>
            {truncateMessage(thread.latestMessage)}
          </p>

          {/* Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {isRecent 
                  ? formatDistanceToNow(new Date(thread.latestDate), { addSuffix: true })
                  : format(new Date(thread.latestDate), 'MMM dd, yyyy')
                }
              </span>
            </div>
            {hasUnread && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5 animate-pulse">
                {thread.unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className={cn(
          "h-5 w-5 flex-shrink-0 transition-colors",
          isSelected ? "text-primary" : "text-muted-foreground/50"
        )} />
      </div>
    </motion.button>
  );
};