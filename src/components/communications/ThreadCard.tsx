import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, MessageSquare, Users, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface ThreadCardProps {
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
  onClick: () => void;
}

export const ThreadCard: React.FC<ThreadCardProps> = ({ thread, onClick }) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'call': return <Phone className="h-4 w-4 text-green-500" />;
      case 'meeting': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
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

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (!content || content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const relativeTime = formatDistanceToNow(new Date(thread.latestMessage.communication_date), { 
    addSuffix: true 
  });

  const isOutbound = thread.latestMessage.direction === 'outbound';

  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        "border-l-4",
        isOutbound 
          ? "border-l-primary/60 bg-gradient-to-br from-background via-background to-primary/5" 
          : "border-l-accent/60 bg-gradient-to-br from-background via-muted/20 to-accent/5",
        thread.hasUnread && "border-l-destructive bg-destructive/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header with Customer Info */}
        <div className="flex items-start gap-4 mb-3">
          <Avatar className="h-12 w-12 shadow-md">
            <AvatarFallback className={cn(
              "text-sm font-bold",
              isOutbound ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"
            )}>
              {getInitials(thread.customer?.company_name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className={cn(
                "font-bold text-base line-clamp-1",
                thread.hasUnread && "text-foreground"
              )}>
                {thread.subject}
              </h3>
              <Badge 
                variant="outline" 
                className={cn(
                  "flex-shrink-0 font-semibold shadow-sm",
                  isOutbound 
                    ? "bg-primary/10 text-primary border-primary/30" 
                    : "bg-accent/10 text-accent border-accent/30"
                )}
              >
                {thread.messageCount} {thread.messageCount === 1 ? 'msg' : 'msgs'}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground font-medium mb-2">
              {thread.customer?.company_name || 'Unknown Customer'}
            </p>
          </div>
        </div>

        {/* Latest Message Preview */}
        <div className={cn(
          "rounded-lg p-3 mb-3 border",
          isOutbound 
            ? "bg-primary/5 border-primary/10" 
            : "bg-muted/30 border-border/50"
        )}>
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
            {truncateContent(thread.latestMessage.content)}
          </p>
        </div>

        {/* Footer with Metadata */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{relativeTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {getTypeIcon(thread.latestMessage.communication_type)}
              <span className="capitalize">{thread.latestMessage.communication_type}</span>
            </div>
          </div>
          
          {thread.hasUnread && (
            <Badge variant="destructive" className="text-xs px-2 shadow-md animate-pulse">
              New
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
