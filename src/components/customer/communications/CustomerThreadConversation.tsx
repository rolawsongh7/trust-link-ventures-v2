import React, { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Send, 
  Mail, 
  Phone, 
  Users, 
  MessageSquare, 
  ArrowLeft,
  Calendar,
  CheckCheck,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { CommunicationThread } from './ThreadListItem';

interface CustomerThreadConversationProps {
  thread: CommunicationThread | null;
  onBack?: () => void;
  onReply: (content: string) => Promise<void>;
  isMobile?: boolean;
}

export const CustomerThreadConversation: React.FC<CustomerThreadConversationProps> = ({ 
  thread, 
  onBack,
  onReply,
  isMobile = false
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when thread changes or new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.communications.length]);

  if (!thread) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary/50" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Select a conversation</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a thread from the list to view messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!replyContent.trim() || sending) return;
    
    setSending(true);
    try {
      await onReply(replyContent.trim());
      setReplyContent('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getMessageIcon = (type: string) => {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          {isMobile && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground truncate">{thread.subject}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <Badge variant="outline" className="text-xs">
                {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'}
              </Badge>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(thread.latestDate), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {thread.communications.map((comm, index) => {
              const isOutbound = comm.direction === 'outbound';
              const senderName = isOutbound ? 'You' : (comm.contact_person || 'Support Team');
              
              return (
                <motion.div
                  key={comm.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex gap-3",
                    isOutbound ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <Avatar className={cn(
                    "h-8 w-8 flex-shrink-0",
                    isOutbound 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-accent text-accent-foreground"
                  )}>
                    <AvatarFallback className={cn(
                      "text-xs font-medium",
                      isOutbound 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-accent text-accent-foreground"
                    )}>
                      {getInitials(senderName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Message bubble */}
                  <div className={cn(
                    "flex-1 max-w-[80%] space-y-1",
                    isOutbound ? "items-end" : "items-start"
                  )}>
                    {/* Sender and time */}
                    <div className={cn(
                      "flex items-center gap-2 text-xs text-muted-foreground",
                      isOutbound ? "justify-end" : "justify-start"
                    )}>
                      <span className="font-medium">{senderName}</span>
                      <span>•</span>
                      <span>{format(new Date(comm.communication_date), 'h:mm a')}</span>
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      "rounded-2xl px-4 py-3 shadow-sm",
                      isOutbound 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted rounded-bl-md"
                    )}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {comm.content}
                      </p>
                    </div>

                    {/* Status */}
                    <div className={cn(
                      "flex items-center gap-1 text-xs text-muted-foreground",
                      isOutbound ? "justify-end" : "justify-start"
                    )}>
                      <span className="flex items-center gap-1">
                        {getMessageIcon(comm.communication_type)}
                        <span className="capitalize">{comm.communication_type}</span>
                      </span>
                      {isOutbound && (
                        <span className="flex items-center gap-0.5 ml-2">
                          <CheckCheck className="h-3 w-3 text-primary" />
                          Sent
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Reply composer */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        <div className="flex gap-3">
          <Textarea
            placeholder="Type your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none min-h-[60px] border-2 focus:ring-2 focus:ring-primary/20"
          />
          <Button
            onClick={handleSend}
            disabled={!replyContent.trim() || sending}
            className="self-end bg-primary hover:bg-primary/90"
          >
            {sending ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};