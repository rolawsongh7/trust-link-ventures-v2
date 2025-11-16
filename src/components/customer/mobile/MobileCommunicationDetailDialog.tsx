import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Phone, MessageSquare, Calendar, User } from 'lucide-react';

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

interface MobileCommunicationDetailDialogProps {
  communication: Communication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileCommunicationDetailDialog: React.FC<MobileCommunicationDetailDialogProps> = ({
  communication,
  open,
  onOpenChange,
}) => {
  if (!communication) return null;

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
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
        Received
      </Badge>
    );
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getMessageIcon(communication.communication_type, communication.direction)}
            <span className="truncate">{communication.subject}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {/* Meta Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  {getMessageIcon(communication.communication_type, communication.direction)}
                  {formatType(communication.communication_type)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Direction</p>
                <div className="flex items-center">
                  {getDirectionBadge(communication.direction)}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(communication.communication_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {new Date(communication.communication_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Contact Person */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {communication.direction === 'outbound' ? 'To' : 'From'}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>
                  {communication.direction === 'outbound' 
                    ? 'Support Team' 
                    : communication.contact_person}
                </span>
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Message</p>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {communication.content}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
