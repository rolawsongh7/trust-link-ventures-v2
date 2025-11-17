import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageSquare, Send, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CommunicationThread } from './MobileCommunicationThreadCard';

interface MobileCommunicationThreadViewProps {
  thread: CommunicationThread | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileCommunicationThreadView: React.FC<MobileCommunicationThreadViewProps> = ({ 
  thread, 
  open, 
  onOpenChange 
}) => {
  if (!thread) return null;

  const getMessageIcon = (type: string, direction: string) => {
    if (direction === 'outbound') {
      return <Send className="h-4 w-4 text-primary" />;
    }
    
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'phone':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'meeting':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <Inbox className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'outbound' ? (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-secondary">
        Received
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-left pr-8">{thread.subject}</DialogTitle>
          <p className="text-sm text-muted-foreground text-left">
            {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'} in conversation
          </p>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {thread.communications.map((comm, index) => {
              const isFirst = index === 0;
              const isLast = index === thread.communications.length - 1;
              const isReply = comm.thread_position && comm.thread_position > 0;
              
              return (
                <div 
                  key={comm.id}
                  className={cn(
                    "relative",
                    !isLast && "pb-4"
                  )}
                >
                  {/* Thread connector line */}
                  {!isLast && (
                    <div 
                      className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-border" 
                      style={{ height: 'calc(100% - 3rem)' }}
                    />
                  )}
                  
                  <Card className={cn(
                    "relative transition-colors",
                    comm.direction === 'outbound' 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-card border-border'
                  )}>
                    <CardContent className="p-4 space-y-3">
                      {/* Message header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getMessageIcon(comm.communication_type, comm.direction)}
                          <span className="text-sm font-medium truncate">
                            {comm.direction === 'outbound' ? 'You' : (comm.contact_person || 'Support Team')}
                          </span>
                          {isReply && (
                            <Badge variant="outline" className="text-xs">
                              Reply
                            </Badge>
                          )}
                        </div>
                        {getDirectionBadge(comm.direction)}
                      </div>
                      
                      {/* Message content */}
                      <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {comm.content}
                      </div>
                      
                      {/* Message timestamp */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <span>
                          {format(new Date(comm.communication_date), 'MMM dd, yyyy • hh:mm a')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
