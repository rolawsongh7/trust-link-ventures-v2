import React from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface CommunicationThread {
  id: string;
  subject: string;
  latestMessage: string;
  latestDate: string;
  messageCount: number;
  unreadCount: number;
  communications: Array<{
    id: string;
    subject: string;
    content: string;
    communication_type: string;
    direction: 'inbound' | 'outbound';
    communication_date: string;
    contact_person?: string;
    created_by?: string;
    thread_position?: number;
    read_at?: string | null;
  }>;
}

interface MobileCommunicationThreadCardProps {
  thread: CommunicationThread;
  onClick: () => void;
}

export const MobileCommunicationThreadCard: React.FC<MobileCommunicationThreadCardProps> = ({ 
  thread, 
  onClick 
}) => {
  const truncateMessage = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const hasUnread = thread.unreadCount > 0;
  const latestComm = thread.communications[thread.communications.length - 1];

  return (
    <InteractiveCard 
      onClick={onClick}
      className={cn(
        "mb-4 overflow-hidden bg-gradient-to-br from-background via-background/95 to-primary/5 hover:shadow-2xl transition-all duration-300 border-2",
        hasUnread 
          ? "border-primary/50 animate-pulse ring-2 ring-primary/20" 
          : "border-border/50 hover:border-primary/30"
      )}
    >
      <div className="space-y-4 p-5">
        {/* Thread header with gradient background */}
        <div className="flex justify-between items-start gap-3 pb-3 border-b border-gradient-to-r from-border via-border/50 to-transparent">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg shadow-sm">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground line-clamp-2 break-words leading-tight mb-1">
                {thread.subject}
              </h3>
              {latestComm && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="font-medium">
                    {latestComm.direction === 'outbound' ? 'You' : (latestComm.contact_person || 'Support')}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="capitalize">{latestComm.communication_type}</span>
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="flex-shrink-0 bg-primary/10 text-primary font-bold shadow-sm"
          >
            {thread.messageCount}
          </Badge>
        </div>
        
        {/* Latest message preview with background */}
        <div className="bg-gradient-to-br from-muted/30 via-background to-muted/20 rounded-lg p-3 border border-border/50">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {truncateMessage(thread.latestMessage)}
          </p>
        </div>
        
        {/* Date and indicators */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">
              {format(new Date(thread.latestDate), 'MMM dd, yyyy')}
            </span>
          </div>
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="text-xs font-bold shadow-lg animate-pulse"
            >
              {thread.unreadCount} new
            </Badge>
          )}
        </div>
      </div>
    </InteractiveCard>
  );
};
