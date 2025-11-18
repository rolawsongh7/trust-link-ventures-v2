import React from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageSquare, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Communication {
  id: string;
  subject: string;
  content: string;
  communication_type: string;
  direction: 'inbound' | 'outbound';
  communication_date: string;
  created_by?: string;
  contact_person?: string;
}

interface MobileCommunicationCardProps {
  communication: Communication;
  onClick: () => void;
}

export const MobileCommunicationCard: React.FC<MobileCommunicationCardProps> = ({
  communication,
  onClick
}) => {
  const getMessageIcon = (type: string, direction: string) => {
    const iconClass = direction === 'outbound' 
      ? 'h-6 w-6 text-primary' 
      : 'h-6 w-6 text-accent';
    
    switch (type.toLowerCase()) {
      case 'email':
        return <Mail className={iconClass} />;
      case 'phone':
        return <Phone className={iconClass} />;
      default:
        return <MessageSquare className={iconClass} />;
    }
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'outbound' ? (
      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold shadow-sm">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 text-xs font-semibold shadow-sm">
        Received
      </Badge>
    );
  };

  const truncateContent = (content: string, maxLength: number = 120) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <InteractiveCard
      variant="elevated"
      interactive={true}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border-l-4 transition-all duration-300",
        communication.direction === 'outbound'
          ? "border-l-primary/60 bg-gradient-to-br from-primary/5 via-primary/8 to-primary/12 hover:shadow-xl hover:shadow-primary/10"
          : "border-l-accent/60 bg-gradient-to-br from-accent/5 via-accent/8 to-background hover:shadow-xl hover:shadow-accent/10"
      )}
    >
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={cn(
              "p-2 rounded-lg",
              communication.direction === 'outbound' ? "bg-primary/10" : "bg-accent/10"
            )}>
              {getMessageIcon(communication.communication_type, communication.direction)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate">{communication.subject}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {communication.direction === 'outbound' 
                  ? 'To: Support Team' 
                  : `From: ${communication.contact_person || 'Support'}`}
              </p>
            </div>
          </div>
          {getDirectionBadge(communication.direction)}
        </div>

        {/* Content Preview with gradient fade */}
        <div className="relative">
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {truncateContent(communication.content)}
          </p>
          <div className="absolute bottom-0 right-0 w-16 h-6 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none" />
        </div>

        {/* Footer with gradient separator */}
        <div className="pt-3 border-t border-gradient-to-r from-border via-border/50 to-transparent">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span className="font-medium">
                {new Date(communication.communication_date).toLocaleDateString()}
              </span>
            </div>
            <span className="font-medium">
              {new Date(communication.communication_date).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        </div>
      </div>
    </InteractiveCard>
  );
};
