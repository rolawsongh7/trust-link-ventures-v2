import React from 'react';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MessageSquare, Calendar } from 'lucide-react';

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
      ? 'h-5 w-5 text-primary' 
      : 'h-5 w-5 text-accent';
    
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
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-xs">
        Received
      </Badge>
    );
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <InteractiveCard
      variant="elevated"
      interactive={true}
      onClick={onClick}
      className="border-l-4 border-l-primary/50"
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getMessageIcon(communication.communication_type, communication.direction)}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{communication.subject}</h4>
              <p className="text-xs text-muted-foreground truncate">
                {communication.direction === 'outbound' 
                  ? 'To: Support Team' 
                  : `From: ${communication.contact_person}`}
              </p>
            </div>
          </div>
          {getDirectionBadge(communication.direction)}
        </div>

        {/* Content Preview */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {truncateContent(communication.content)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(communication.communication_date).toLocaleDateString()}
          </div>
          <span>
            {new Date(communication.communication_date).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </InteractiveCard>
  );
};
