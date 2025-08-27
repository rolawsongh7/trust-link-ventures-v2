import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Clock, Paperclip } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerLayout } from '@/components/customer/CustomerLayout';

interface Communication {
  id: string;
  subject?: string;
  content?: string;
  communication_type: string;
  communication_date: string;
  created_by?: string;
  customer_id?: string;
  lead_id?: string;
}

export const CustomerCommunications: React.FC = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState({ subject: '', content: '' });
  const [sending, setSending] = useState(false);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchCommunications();
  }, [profile]);

  const fetchCommunications = async () => {
    if (!profile?.email) return;

    try {
      // First, get the customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (customer) {
        const { data, error } = await supabase
          .from('communications')
          .select('*')
          .eq('customer_id', customer.id)
          .order('communication_date', { ascending: false });

        if (error) throw error;
        setCommunications(data || []);
      }
    } catch (error) {
      console.error('Error fetching communications:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!profile?.email || !newMessage.subject.trim() || !newMessage.content.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in both subject and message content.",
      });
      return;
    }

    setSending(true);

    try {
      // Get customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!customer) {
        throw new Error('Customer record not found');
      }

      const { error } = await supabase
        .from('communications')
        .insert([
          {
            customer_id: customer.id,
            subject: newMessage.subject,
            content: newMessage.content,
            communication_type: 'email',
            communication_date: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully. We'll get back to you soon!",
      });

      setNewMessage({ subject: '', content: '' });
      fetchCommunications(); // Refresh the list

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Send Failed",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'phone': return 'bg-green-100 text-green-800 border-green-200';
      case 'meeting': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Communications
          </h1>
          <p className="text-muted-foreground">
            Message center for all your communications with our team
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <MessageSquare className="h-4 w-4 mr-2" />
          {communications.length} Messages
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No messages yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start a conversation with our team
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {comm.created_by ? 'Support Team' : 'You'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getMessageTypeColor(comm.communication_type)}>
                            {comm.communication_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(comm.communication_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {comm.subject && (
                        <h4 className="font-medium mb-2">{comm.subject}</h4>
                      )}
                      
                      {comm.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {comm.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* New Message Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send New Message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  placeholder="Enter message subject"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  rows={6}
                />
              </div>
              
              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.subject.trim() || !newMessage.content.trim()}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
                
                <Button variant="outline" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>Our support team typically responds within 24 hours during business days.</p>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Company:</span> {profile?.company_name}
              </div>
              <div>
                <span className="font-medium">Contact:</span> {profile?.full_name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {profile?.email}
              </div>
              {profile?.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {profile.phone}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </CustomerLayout>
  );
};