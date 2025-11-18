import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { PortalPageHeader } from './PortalPageHeader';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileCommunicationCard } from './mobile/MobileCommunicationCard';
import { MobileCommunicationDetailDialog } from './mobile/MobileCommunicationDetailDialog';
import { MobileCommunicationThreadCard, CommunicationThread } from './mobile/MobileCommunicationThreadCard';
import { MobileCommunicationThreadView } from './mobile/MobileCommunicationThreadView';
import { 
  MessageSquare, 
  Send, 
  Calendar,
  User,
  Mail,
  Phone,
  AlertCircle,
  Inbox,
  CheckCircle2
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
  parent_communication_id?: string | null;
  thread_id?: string | null;
  thread_position?: number;
}

export const CustomerCommunications: React.FC = () => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const { isMobile } = useMobileDetection();
  
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState({
    subject: '',
    content: ''
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null);
  const [threadViewOpen, setThreadViewOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<CommunicationThread | null>(null);

  useEffect(() => {
    fetchCommunications();
  }, [profile]);

  // Real-time subscription for thread updates
  useEffect(() => {
    if (!profile?.email) return;

    const channel = supabase
      .channel('customer-communications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communications'
        },
        () => {
          fetchCommunications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      // Fetch communications for this customer with threading info
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
        contact_person: comm.contact_person || 'Support Team',
        parent_communication_id: comm.parent_communication_id,
        thread_id: comm.thread_id,
        thread_position: comm.thread_position || 0
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
      const { data, error } = await supabase
        .from('communications')
        .insert({
          customer_id: customerId,
          communication_type: 'email',
          subject: newMessage.subject,
          content: newMessage.content,
          direction: 'outbound',
          contact_person: profile.full_name || 'Customer',
          communication_date: new Date().toISOString(),
          parent_communication_id: null,
          thread_id: null, // Will be set to message ID after insert
          thread_position: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Update thread_id to self for new conversations
      if (data) {
        await supabase
          .from('communications')
          .update({ thread_id: data.id })
          .eq('id', data.id);
      }

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

  const handleViewCommunicationDetails = (communication: Communication) => {
    setSelectedCommunication(communication);
    setDetailDialogOpen(true);
  };

  const handleViewThread = (thread: CommunicationThread) => {
    setSelectedThread(thread);
    setThreadViewOpen(true);
  };

  // Group communications into threads
  const groupCommunicationsIntoThreads = (comms: Communication[]): CommunicationThread[] => {
    const threadMap = new Map<string, CommunicationThread>();
    
    comms.forEach(comm => {
      const threadId = comm.thread_id || comm.id;
      
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          id: threadId,
          subject: comm.subject,
          latestMessage: comm.content,
          latestDate: comm.communication_date,
          messageCount: 0,
          unreadCount: 0,
          communications: []
        });
      }
      
      const thread = threadMap.get(threadId)!;
      thread.communications.push(comm);
      thread.messageCount++;
      
      // Update latest message info if this message is newer
      if (new Date(comm.communication_date) > new Date(thread.latestDate)) {
        thread.latestMessage = comm.content;
        thread.latestDate = comm.communication_date;
      }
    });
    
    // Sort each thread's communications by position and date
    threadMap.forEach(thread => {
      thread.communications.sort((a, b) => {
        const posA = a.thread_position || 0;
        const posB = b.thread_position || 0;
        if (posA !== posB) return posA - posB;
        return new Date(a.communication_date).getTime() - new Date(b.communication_date).getTime();
      });
    });
    
    // Sort threads by latest activity
    return Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  };

  const threads = useMemo(() => 
    groupCommunicationsIntoThreads(communications),
    [communications]
  );

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

  const totalMessages = communications.length;
  const totalThreads = threads.length;
  const unreadCount = 0; // This would need to be tracked in the database
  const recentCount = communications.filter(c => {
    const daysDiff = Math.floor((new Date().getTime() - new Date(c.communication_date).getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7;
  }).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Portal Page Header */}
      <PortalPageHeader
        title="Communications"
        subtitle="Send messages to our team and view communication history"
        totalCount={totalThreads}
        totalIcon={MessageSquare}
        stats={[
          { label: 'Conversations', count: totalThreads, icon: MessageSquare },
          { label: 'Total Messages', count: totalMessages, icon: Inbox },
          { label: 'Recent', count: recentCount, icon: CheckCircle2 }
        ]}
        variant="customer"
      />

      {/* Send New Message */}
      <Card className="relative overflow-hidden border-2 border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300">
        {/* Gradient background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <CardHeader className="relative border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/20 rounded-lg shadow-sm">
              <Send className="h-6 w-6 text-primary" />
            </div>
            Send New Message
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative pt-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Subject</label>
              <Input
                placeholder="Enter message subject"
                value={newMessage.subject}
                onChange={(e) => setNewMessage(prev => ({ ...prev, subject: e.target.value }))}
                className="border-2 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Message</label>
              <Textarea
                placeholder="Type your message here..."
                rows={4}
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                className="border-2 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.subject.trim() || !newMessage.content.trim()}
              className="relative overflow-hidden flex-1 bg-gradient-to-r from-primary via-primary/90 to-accent hover:shadow-xl transition-all duration-300 group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Send className="h-4 w-4 mr-2 relative z-10" />
              <span className="relative z-10">{sending ? 'Sending...' : 'Send Message'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="border-2 border-accent/30 bg-gradient-to-br from-background via-accent/5 to-background shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-accent/20 rounded-lg shadow-sm">
              <User className="h-6 w-6 text-accent" />
            </div>
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-primary/5 to-background rounded-xl border-2 border-primary/20 hover:shadow-lg transition-all">
              <div className="p-3 bg-primary/20 rounded-lg shadow-sm">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Email Support</p>
                <p className="text-sm text-muted-foreground">support@trustlinkventures.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-green-50/50 to-background rounded-xl border-2 border-green-200/50 hover:shadow-lg transition-all">
              <div className="p-3 bg-green-100 rounded-lg shadow-sm">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Phone Support</p>
                <p className="text-sm text-muted-foreground">+233 (0) 24 123 4567</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card className="border-2 border-indigo-400/30 bg-gradient-to-br from-background via-indigo-50/5 to-background shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-indigo-400/10 via-indigo-400/5 to-transparent border-b">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-indigo-400/20 rounded-lg shadow-sm">
              <MessageSquare className="h-6 w-6 text-indigo-400" />
            </div>
            Communication History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {threads.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="mb-6 relative">
                <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-r from-primary via-accent to-primary animate-pulse" />
                <MessageSquare className="h-20 w-20 text-primary/40 mx-auto relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No communications yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Send your first message to start communicating with our team
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {isMobile ? (
                // Mobile view - use thread cards
                threads.map(thread => (
                  <MobileCommunicationThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => handleViewThread(thread)}
                  />
                ))
              ) : (
                // Desktop view - use thread cards
                threads.map(thread => (
                  <div 
                    key={thread.id} 
                    className="p-4 border border-l-4 border-l-indigo-400 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewThread(thread)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-medium">{thread.subject}</h4>
                          <p className="text-sm text-muted-foreground">
                            {thread.messageCount} {thread.messageCount === 1 ? 'message' : 'messages'} in conversation
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{thread.messageCount}</Badge>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(thread.latestDate).toLocaleDateString()}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(thread.latestDate).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground pl-8 line-clamp-2">{thread.latestMessage}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Thread View Dialog */}
      <MobileCommunicationThreadView
        thread={selectedThread}
        open={threadViewOpen}
        onOpenChange={setThreadViewOpen}
      />

      {/* Legacy Detail Dialog (fallback) */}
      {selectedCommunication && (
        <MobileCommunicationDetailDialog
          communication={selectedCommunication}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />
      )}

      {/* Communication Detail Dialog */}
      <MobileCommunicationDetailDialog
        communication={selectedCommunication}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </div>
  );
};