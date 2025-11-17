import React from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

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
  const truncateMessage = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <InteractiveCard 
      onClick={onClick}
      className="mb-3"
    >
      <div className="space-y-3 p-4">
        {/* Thread header */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <h3 className="font-semibold text-foreground line-clamp-2 break-words">
              {thread.subject}
            </h3>
          </div>
          <Badge variant="secondary" className="flex-shrink-0">
            {thread.messageCount}
          </Badge>
        </div>
        
        {/* Latest message preview */}
        <p className="text-sm text-muted-foreground line-clamp-2 pl-7">
          {truncateMessage(thread.latestMessage)}
        </p>
        
        {/* Date and indicators */}
        <div className="flex justify-between items-center text-xs text-muted-foreground pl-7">
          <span>
            {format(new Date(thread.latestDate), 'MMM dd, yyyy')}
          </span>
          {thread.unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {thread.unreadCount} new
            </Badge>
          )}
        </div>
      </div>
    </InteractiveCard>
  );
};
