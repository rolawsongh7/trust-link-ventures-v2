import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Send, 
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle
} from 'lucide-react';

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

export const CustomerCommunications: React.FC = () => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: ''
  });

  useEffect(() => {
    fetchCommunications();
  }, [profile]);

  const fetchCommunications = async () => {
    if (!profile?.email) return;
    
    try {
      // Mock data for now - in real implementation, this would fetch from the communications table
      const mockData: Communication[] = [
        {
          id: '1',
          subject: 'Welcome to Trust Link Ventures',
          content: 'Thank you for joining our customer portal. We look forward to serving your premium seafood needs.',
          communication_type: 'email',
          direction: 'inbound',
          communication_date: new Date(Date.now() - 86400000).toISOString(),
          contact_person: 'Sales Team'
        },
        {
          id: '2',
          subject: 'Quote Request Received',
          content: 'We have received your quote request for premium mackerel. Our team will review and respond within 24 hours.',
          communication_type: 'email',
          direction: 'inbound',
          communication_date: new Date(Date.now() - 3600000).toISOString(),
          contact_person: 'Quote Team'
        }
      ];
      
      setCommunications(mockData);
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        title: "Error",
        description: "Failed to load communications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.subject.trim() || !newMessage.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and message",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      // In real implementation, this would create a communication record
      // and potentially send an email to the support team
      
      const newCommunication: Communication = {
        id: Date.now().toString(),
        subject: newMessage.subject,
        content: newMessage.content,
        communication_type: 'email',
        direction: 'outbound',
        communication_date: new Date().toISOString(),
        contact_person: profile?.full_name || 'Customer'
      };
      
      setCommunications(prev => [newCommunication, ...prev]);
      setNewMessage({ subject: '', content: '' });
      
      toast({
        title: "Message sent!",
        description: "Your message has been sent to our team. We'll respond soon.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getMessageIcon = (type: string, direction: string) => {
    if (direction === 'outbound') {
      return <Send className="h-4 w-4 text-blue-500" />;
    }
    return <MessageSquare className="h-4 w-4 text-green-500" />;
  };

  const getDirectionBadge = (direction: string) => {
    return direction === 'outbound' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Sent
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        Received
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Communications</h1>
          <p className="text-muted-foreground mt-1">
            Send messages to our team and view communication history
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {communications.length} Messages
        </Badge>
      </div>

      {/* Send New Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send New Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                placeholder="Enter message subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                placeholder="Type your message here..."
                rows={4}
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.subject.trim() || !newMessage.content.trim()}
              className="flex-1 bg-gradient-to-r from-primary to-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground">support@trustlinkventures.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground">+233 (0) 24 123 4567</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No communications yet</h3>
              <p className="text-muted-foreground">
                Send your first message to start communicating with our team
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div key={comm.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getMessageIcon(comm.communication_type, comm.direction)}
                      <div>
                        <h4 className="font-medium">{comm.subject}</h4>
                        <p className="text-sm text-muted-foreground">
                          {comm.direction === 'outbound' ? 'To: Support Team' : `From: ${comm.contact_person}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getDirectionBadge(comm.direction)}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(comm.communication_date).toLocaleDateString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(comm.communication_date).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm pl-7">{comm.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};