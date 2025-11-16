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
      // First find the customer by email
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      if (!customerData) {
        // No customer found, show empty state
        setCommunications([]);
        return;
      }

      // Fetch communications for this customer
      const { data: commsData, error: commsError } = await supabase
        .from('communications')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('communication_date', { ascending: false });

      if (commsError) throw commsError;

      // Transform the data to match our interface
      const transformedComms: Communication[] = (commsData || []).map(comm => ({
        id: comm.id,
        subject: comm.subject || 'No Subject',
        content: comm.content || '',
        communication_type: comm.communication_type || 'email',
        direction: (comm.direction === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound',
        communication_date: comm.communication_date || comm.created_at,
        contact_person: comm.contact_person || 'Support Team'
      }));
      
      setCommunications(transformedComms);
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

    if (!profile?.email) {
      toast({
        title: "Error",
        description: "Unable to identify customer. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    
    try {
      // First, find or create the customer record
      let customerId: string;
      
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer record
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            company_name: profile.company_name || 'Customer Portal User',
            contact_name: profile.full_name || 'Customer',
            email: profile.email,
            customer_status: 'active',
            priority: 'medium'
          })
          .select('id')
          .single();

        if (createError) throw createError;
        customerId = newCustomer.id;
      }

      // Insert the communication record
      const { error: commError } = await supabase
        .from('communications')
        .insert({
          customer_id: customerId,
          communication_type: 'email',
          subject: newMessage.subject,
          content: newMessage.content,
          direction: 'outbound',
          contact_person: profile.full_name || 'Customer',
          communication_date: new Date().toISOString()
        });

      if (commError) throw commError;

      // Refresh communications list
      await fetchCommunications();
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
      <Card className="border-l-4 border-l-indigo-400">
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
      <Card className="border-l-4 border-l-indigo-400">
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
      <Card className="border-l-4 border-l-indigo-400">
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
                <div key={comm.id} className="p-4 border border-l-4 border-l-indigo-400 rounded-lg hover:bg-muted/50 transition-colors">
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