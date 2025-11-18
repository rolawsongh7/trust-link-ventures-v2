import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Phone, MessageSquare, Users, Calendar, Send, Inbox, Reply } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ThreadMessage {
  id: string;
  communication_type: string;
  subject: string;
  content: string;
  communication_date: string;
  direction: string;
  contact_person?: string;
  thread_position?: number;
  created_by?: string;
}

interface ThreadViewProps {
  thread: {
    id: string;
    subject: string;
    messageCount: number;
    messages: ThreadMessage[];
    customer?: {
      company_name: string;
      contact_name?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReply?: (threadId: string, content: string, type: string) => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ 
  thread, 
  open, 
  onOpenChange,
  onReply 
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState('email');

  if (!thread) return null;

  const getMessageIcon = (type: string, direction: string) => {
    if (direction === 'outbound') {
      return <Send className="h-5 w-5 text-primary" />;
    }
    
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5 text-blue-500" />;
      case 'call':
        return <Phone className="h-5 w-5 text-green-500" />;
      case 'meeting':
        return <Users className="h-5 w-5 text-purple-500" />;
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

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSendReply = () => {
    if (!replyContent.trim() || !onReply) return;
    onReply(thread.id, replyContent, replyType);
    setReplyContent('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-accent/5 flex-shrink-0">
          <div className="flex items-center gap-4 mb-3">
            <Avatar className="h-14 w-14 shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-foreground font-bold text-lg">
                {getInitials(thread.customer?.company_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold mb-1">{thread.subject}</DialogTitle>
              <p className="text-sm text-muted-foreground font-medium">
                {thread.customer?.company_name || 'Unknown Customer'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 font-medium shadow-sm">
              {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
            </Badge>
            <Badge variant="outline" className="bg-muted/30 font-medium shadow-sm">
              <Calendar className="h-3 w-3 mr-1" />
              Last: {format(new Date(thread.messages[thread.messages.length - 1].communication_date), 'MMM dd, yyyy')}
            </Badge>
          </div>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {thread.messages.map((msg, index) => {
              const isLast = index === thread.messages.length - 1;
              const isReply = msg.thread_position && msg.thread_position > 0;
              const isOutbound = msg.direction === 'outbound';
              
              return (
                <div 
                  key={msg.id}
                  className={cn(
                    "relative",
                    !isLast && "pb-4"
                  )}
                >
                  {/* Thread connector line */}
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
                      {/* Message header */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "p-2.5 rounded-lg shadow-sm",
                            isOutbound ? "bg-primary/20" : "bg-accent/10"
                          )}>
                            {getMessageIcon(msg.communication_type, msg.direction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-base font-semibold block truncate">
                              {isOutbound ? 'You' : (msg.contact_person || 'Customer')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(msg.communication_date), 'MMM dd, yyyy • h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getDirectionBadge(msg.direction)}
                          {isReply && (
                            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                              <Reply className="h-3 w-3" />
                              Reply
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Message content */}
                      <div className={cn(
                        "rounded-lg p-4 border",
                        isOutbound 
                          ? "bg-background/50 border-primary/20" 
                          : "bg-muted/30 border-border/50"
                      )}>
                        <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Quick Reply Section */}
        {onReply && (
          <div className="border-t p-4 bg-gradient-to-r from-muted/20 to-background flex-shrink-0">
            <div className="space-y-3">
              <Textarea 
                placeholder="Type your reply..." 
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <Select value={replyType} onValueChange={setReplyType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Reply</SelectItem>
                    <SelectItem value="call">Log Call</SelectItem>
                    <SelectItem value="note">Add Note</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleSendReply}
                  disabled={!replyContent.trim()}
                  className="shadow-md"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
