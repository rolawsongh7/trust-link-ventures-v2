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
      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 font-semibold shadow-sm">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30 font-semibold shadow-sm">
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
        <DialogHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b-2 pb-4 -mt-2 -mx-6 px-6 pt-6 mb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg shadow-sm",
              communication.direction === 'outbound' ? "bg-primary/20" : "bg-accent/10"
            )}>
              {getMessageIcon(communication.communication_type, communication.direction)}
            </div>
            <span className="truncate text-lg font-bold">{communication.subject}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6 pr-4">
            {/* Enhanced Meta Information Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-primary/5 to-background rounded-xl p-4 border-2 border-primary/20 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium mb-2">Type</p>
                <p className="text-sm font-semibold flex items-center gap-2">
                  {getMessageIcon(communication.communication_type, communication.direction)}
                  {formatType(communication.communication_type)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-accent/5 to-background rounded-xl p-4 border-2 border-accent/20 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium mb-2">Direction</p>
                <div className="flex items-center">
                  {getDirectionBadge(communication.direction)}
                </div>
              </div>
            </div>

            {/* Enhanced Date & Time */}
            <div className="bg-gradient-to-br from-muted/30 via-background to-muted/20 rounded-xl p-4 border-2 border-border/50 shadow-sm">
              <p className="text-xs text-muted-foreground font-medium mb-2">Date & Time</p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {new Date(communication.communication_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground pl-7 mt-1 font-medium">
                {new Date(communication.communication_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Contact Person */}
            {communication.contact_person && (
              <div className="bg-gradient-to-br from-indigo-50/50 via-background to-indigo-50/30 rounded-xl p-4 border-2 border-indigo-200/50 shadow-sm">
                <p className="text-xs text-muted-foreground font-medium mb-2">
                  {communication.direction === 'outbound' ? 'Sent To' : 'From'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">{communication.contact_person}</span>
                </div>
              </div>
            )}

            {/* Enhanced Content Section */}
            <div className="mt-6 p-5 bg-gradient-to-br from-muted/30 via-background to-muted/20 rounded-xl border-2 border-border/50 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Message Content
              </h3>
              <div className="prose prose-sm max-w-none">
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
