import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageSquare, Send, Inbox, Calendar, Reply } from 'lucide-react';
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
      return <Send className="h-5 w-5 text-primary" />;
    }
    
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-500" />;
      case 'phone':
        return <Phone className="h-5 w-5 text-green-500" />;
      case 'meeting':
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      default:
        return <Inbox className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'outbound' ? (
      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 font-semibold shadow-sm">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 font-semibold shadow-sm">
        Received
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5">
          <DialogTitle className="text-left pr-8 text-xl font-bold">{thread.subject}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
            <Badge variant="outline" className="bg-primary/10 font-medium">
              {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
            </Badge>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Last: {format(new Date(thread.latestDate), 'MMM dd, yyyy')}
            </span>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {thread.communications.map((comm, index) => {
              const isFirst = index === 0;
              const isLast = index === thread.communications.length - 1;
              const isReply = comm.thread_position && comm.thread_position > 0;
              const isOutbound = comm.direction === 'outbound';
              
              return (
                <div 
                  key={comm.id}
                  className={cn(
                    "relative",
                    !isLast && "pb-4"
                  )}
                >
                  {/* Enhanced thread connector line with gradient */}
                  {!isLast && (
                    <div 
                      className="absolute left-7 top-16 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border" 
                      style={{ height: 'calc(100% - 4rem)' }}
                    />
                  )}
                  
                  <Card className={cn(
                    "relative transition-all duration-300 border-2",
                    isOutbound 
                      ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/30 shadow-lg shadow-primary/10' 
                      : 'bg-gradient-to-br from-background via-muted/30 to-accent/5 border-border/50 shadow-lg shadow-muted/20'
                  )}>
                    <CardContent className="p-5 space-y-4">
                      {/* Enhanced message header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "p-2 rounded-lg shadow-sm",
                            isOutbound ? "bg-primary/20" : "bg-accent/10"
                          )}>
                            {getMessageIcon(comm.communication_type, comm.direction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-base font-semibold block truncate">
                              {isOutbound ? 'You' : (comm.contact_person || 'Support Team')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comm.communication_date), 'MMM dd, yyyy • h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getDirectionBadge(comm.direction)}
                          {isReply && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              Reply
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Enhanced message content */}
                      <div className={cn(
                        "rounded-lg p-4 border",
                        isOutbound 
                          ? "bg-background/50 border-primary/20" 
                          : "bg-muted/30 border-border/50"
                      )}>
                        <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                          {comm.content}
                        </p>
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
