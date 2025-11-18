import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { Plus, Search, Edit, Phone, Mail, Calendar, MessageSquare, Users, Clock, Reply, Send, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { ThreadCard } from '@/components/communications/ThreadCard';
import { ThreadView } from '@/components/communications/ThreadView';
import { groupCommunicationsIntoThreads } from '@/components/communications/groupThreads';

interface Communication {
  id: string;
  communication_type: string;
  subject: string;
  content: string;
  communication_date: string;
  created_at: string;
  direction: string;
  thread_id?: string;
  thread_position?: number;
  parent_communication_id?: string;
  contact_person?: string;
  created_by?: string;
  customers?: {
    id: string;
    company_name: string;
    contact_name?: string;
  };
  leads?: {
    id: string;
    title: string;
  };
}

interface Customer {
  id: string;
  company_name: string;
}

interface Lead {
  id: string;
  title: string;
}

const CommunicationsManagement = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
  const [replyingToCommunication, setReplyingToCommunication] = useState<Communication | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isThreadViewOpen, setIsThreadViewOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      communication_type: 'email',
      subject: '',
      content: '',
      customer_id: '',
      lead_id: '',
      communication_date: ''
    }
  });

  useEffect(() => {
    fetchCommunications();
    fetchCustomers();
    fetchLeads();

    // Set up real-time subscription for communications
    const channel = supabase
      .channel('communications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communications'
        },
        (payload) => {
          console.log('Communication change received:', payload);
          if (payload.eventType === 'INSERT') {
            fetchCommunications(); // Refetch to get related data
          } else if (payload.eventType === 'UPDATE') {
            setCommunications(prev => 
              prev.map(comm => 
                comm.id === payload.new.id 
                  ? { ...comm, ...payload.new } as Communication
                  : comm
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCommunications(prev => 
              prev.filter(comm => comm.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (editingCommunication) {
      form.reset({
        communication_type: editingCommunication.communication_type || 'email',
        subject: editingCommunication.subject || '',
        content: editingCommunication.content || '',
        customer_id: '',
        lead_id: '',
        communication_date: editingCommunication.communication_date || ''
      });
    }
  }, [editingCommunication, form]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('communications')
        .select(`
          *,
          customers(
            id,
            company_name,
            contact_name,
            email
          ),
          leads(
            id,
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
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

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      // Clean up empty string UUIDs to null
      const cleanedData = {
        communication_type: data.communication_type,
        subject: data.subject || '',
        content: data.content || '',
        customer_id: data.customer_id || null,
        lead_id: data.lead_id || null,
        communication_date: data.communication_date || new Date().toISOString(),
        direction: 'inbound',
        contact_person: 'Support Team'
      };

      if (editingCommunication) {
        // Update existing communication (don't modify threading fields)
        const { error } = await supabase
          .from('communications')
          .update(cleanedData)
          .eq('id', editingCommunication.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Communication updated successfully",
        });
      } else if (replyingToCommunication) {
        // Insert reply with threading info
        const replyData = {
          ...cleanedData,
          customer_id: (replyingToCommunication as any).customers?.id || cleanedData.customer_id,
          parent_communication_id: replyingToCommunication.id,
          thread_id: (replyingToCommunication as any).thread_id || replyingToCommunication.id,
          thread_position: ((replyingToCommunication as any).thread_position || 0) + 1,
          subject: data.subject || `Re: ${replyingToCommunication.subject}`
        };
        
        const { error } = await supabase
          .from('communications')
          .insert(replyData);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Reply sent successfully",
        });
      } else {
        // Insert new communication (start new thread)
        const { data: insertedData, error: insertError } = await supabase
          .from('communications')
          .insert({
            ...cleanedData,
            parent_communication_id: null,
            thread_id: null, // Will be set to message ID after insert
            thread_position: 0
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // Update thread_id to self for new conversations
        if (insertedData) {
          await supabase
            .from('communications')
            .update({ thread_id: insertedData.id })
            .eq('id', insertedData.id);
        }

        toast({
          title: "Success",
          description: "Communication logged successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingCommunication(null);
      setReplyingToCommunication(null);
      form.reset();
      fetchCommunications();
    } catch (error: any) {
      console.error('Error saving communication:', error);
      toast({
        title: "Error",
        description: "Failed to save communication",
        variant: "destructive",
      });
    }
  };

  const handleReply = (originalComm: Communication) => {
    if (!originalComm.customers) return;
    
    setReplyingToCommunication(originalComm);
    form.reset({
      communication_type: 'email',
      subject: `Re: ${originalComm.subject}`,
      content: '',
      customer_id: '',
      lead_id: '',
      communication_date: new Date().toISOString().slice(0, 16)
    });
    setIsDialogOpen(true);
  };

  const handleQuickReply = async (threadId: string, content: string, type: string) => {
    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;

      const lastMessage = thread.messages[thread.messages.length - 1];
      const firstMessage = thread.messages[0];
      
      // Map 'call' to 'phone' for database compatibility
      const commType = type === 'call' ? 'phone' : type;
      
      const replyData = {
        communication_type: commType as 'email' | 'phone' | 'meeting' | 'note',
        subject: `Re: ${thread.subject}`,
        content,
        customer_id: firstMessage.customers?.id || null,
        lead_id: null,
        communication_date: new Date().toISOString(),
        direction: 'outbound',
        contact_person: 'Support Team',
        parent_communication_id: lastMessage.id,
        thread_id: threadId,
        thread_position: (lastMessage.thread_position || 0) + 1,
      };

      const { error } = await supabase
        .from('communications')
        .insert([replyData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });

      fetchCommunications();
    } catch (error: any) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  // Group communications into threads
  const threads = useMemo(() => {
    return groupCommunicationsIntoThreads(communications);
  }, [communications]);

  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      const matchesSearch = 
        thread.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.messages.some(msg => 
          msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        thread.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || 
        thread.messages.some(msg => msg.communication_type === typeFilter);
      
      const matchesContactForm = typeFilter === 'contact_form' 
        ? thread.subject?.includes('Contact Form:')
        : true;
      
      return matchesSearch && (matchesType || matchesContactForm);
    });
  }, [threads, searchTerm, typeFilter]);

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'call': return Phone;
      case 'meeting': return Users;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'default';
      case 'call': return 'secondary';
      case 'meeting': return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        variant="admin"
        title="Communications Hub"
        subtitle="Track all customer communications and interactions"
        totalIcon={MessageSquare}
        totalCount={communications.length}
        stats={[
          { label: 'Today', count: communications.filter(c => new Date(c.communication_date).toDateString() === new Date().toDateString()).length, icon: Clock },
          { label: 'This Week', count: communications.filter(c => {
            const date = new Date(c.communication_date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
          }).length, icon: Calendar },
          { label: 'Emails', count: communications.filter(c => c.communication_type === 'email').length, icon: Inbox },
        ]}
      />
      
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingCommunication(null);
              setReplyingToCommunication(null);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCommunication 
                  ? 'Edit Communication' 
                  : replyingToCommunication 
                    ? 'Reply to Customer' 
                    : 'Log New Communication'}
              </DialogTitle>
              <DialogDescription>
                {editingCommunication 
                  ? 'Update communication details' 
                  : replyingToCommunication 
                    ? `Replying to ${replyingToCommunication.customers?.company_name}` 
                    : 'Record a customer interaction'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="communication_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="call">Phone Call</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Communication subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {!replyingToCommunication && (
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.company_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {replyingToCommunication && (
                    <div className="col-span-1">
                      <FormLabel>Replying to Customer</FormLabel>
                      <div className="p-2 bg-muted rounded border">
                        {replyingToCommunication.customers?.company_name}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="lead_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Lead (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leads.map((lead) => (
                              <SelectItem key={lead.id} value={lead.id}>
                                {lead.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="communication_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Communication Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content/Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Communication details, notes, or transcript..." 
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCommunication ? 'Update' : 'Log'} Communication
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="contact_form">📧 Contact Forms</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="call">Phone Call</SelectItem>
            <SelectItem value="meeting">Meeting</SelectItem>
            <SelectItem value="note">Note</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredThreads.map((thread) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            onClick={() => {
              setSelectedThreadId(thread.id);
              setIsThreadViewOpen(true);
            }}
          />
        ))}

        {filteredThreads.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground text-lg font-medium">No communications found</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Start by logging your first communication'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <ThreadView
        thread={selectedThread || null}
        open={isThreadViewOpen}
        onOpenChange={setIsThreadViewOpen}
        onReply={handleQuickReply}
      />
    </div>
  );
};

export default CommunicationsManagement;