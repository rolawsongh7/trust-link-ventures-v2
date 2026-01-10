import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, Phone, Users, MessageSquare, Send, Clock, 
  ArrowUpRight, ArrowDownLeft, X 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  communication_date: string;
  communication_type: string;
  direction: string;
  contact_person?: string;
  created_by?: string;
}

interface ConversationPanelProps {
  thread: {
    id: string;
    subject: string;
    messageCount: number;
    messages: Message[];
    customer?: {
      company_name: string;
      contact_name?: string;
    };
  } | null;
  onClose: () => void;
  onReply: (threadId: string, content: string, type: string) => Promise<void>;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  thread,
  onClose,
  onReply
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyType, setReplyType] = useState('email');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread?.messages]);

  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="rounded-full bg-muted/50 p-6 mb-4">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Select a conversation
        </h3>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Choose a thread from the list to view the conversation
        </p>
      </div>
    );
  }

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

  const handleSend = async () => {
    if (!replyContent.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await onReply(thread.id, replyContent, replyType);
      setReplyContent('');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const typeOptions = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'call', label: 'Call', icon: Phone },
    { id: 'meeting', label: 'Meeting', icon: Users },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header */}
      <div className="flex-shrink-0 glass-header px-6 py-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shadow-md ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(thread.customer?.company_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground truncate">
                {thread.subject}
              </h2>
              <p className="text-sm text-muted-foreground truncate">
                {thread.customer?.company_name}
                {thread.customer?.contact_name && ` · ${thread.customer.contact_name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {thread.messageCount} messages
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Timeline */}
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          <AnimatePresence mode="popLayout">
            {thread.messages.map((message, index) => {
              const isOutbound = message.direction === 'outbound';
              const showDateSeparator = index === 0 || 
                new Date(message.communication_date).toDateString() !== 
                new Date(thread.messages[index - 1].communication_date).toDateString();

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-muted/50 rounded-full px-3 py-1 text-xs text-muted-foreground">
                        {format(new Date(message.communication_date), 'EEEE, MMMM d, yyyy')}
                      </div>
                    </div>
                  )}
                  
                  <div className={cn(
                    "flex gap-3",
                    isOutbound ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs font-semibold",
                        isOutbound 
                          ? "bg-primary/15 text-primary" 
                          : "bg-accent/15 text-accent-foreground"
                      )}>
                        {isOutbound ? 'You' : getInitials(thread.customer?.company_name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Message Bubble */}
                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
                      isOutbound 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted rounded-bl-md"
                    )}>
                      {/* Message Header */}
                      <div className={cn(
                        "flex items-center gap-2 mb-1.5 text-xs",
                        isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        <div className="flex items-center gap-1">
                          {isOutbound 
                            ? <ArrowUpRight className="h-3 w-3" />
                            : <ArrowDownLeft className="h-3 w-3" />
                          }
                          {getTypeIcon(message.communication_type)}
                        </div>
                        <span className="capitalize">{message.communication_type}</span>
                        <span>·</span>
                        <span>{format(new Date(message.communication_date), 'h:mm a')}</span>
                      </div>

                      {/* Message Content */}
                      <p className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap",
                        isOutbound ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Reply Composer */}
      <div className="flex-shrink-0 border-t bg-card/50 p-4">
        {/* Type Selector */}
        <div className="flex gap-1 mb-3">
          {typeOptions.map(opt => {
            const Icon = opt.icon;
            const isActive = replyType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setReplyType(opt.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Text Area */}
        <div className="flex gap-2">
          <Textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your reply... (⌘+Enter to send)"
            className="min-h-[80px] resize-none bg-background"
            disabled={isSending}
          />
          <Button
            onClick={handleSend}
            disabled={!replyContent.trim() || isSending}
            className="self-end h-10 px-4"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1.5" />
                Send
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press ⌘+Enter to send quickly
        </p>
      </div>
    </motion.div>
  );
};
