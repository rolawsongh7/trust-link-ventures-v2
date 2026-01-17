import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Plus, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { groupCommunicationsIntoThreads } from '@/components/communications/groupThreads';
import { CommunicationsKPISummary } from '@/components/communications/CommunicationsKPISummary';
import { CommunicationsFilters } from '@/components/communications/CommunicationsFilters';
import { ThreadCardEnhanced } from '@/components/communications/ThreadCardEnhanced';
import { ConversationPanel } from '@/components/communications/ConversationPanel';
import { CommunicationsEmptyState } from '@/components/communications/CommunicationsEmptyState';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isMobileConversationOpen, setIsMobileConversationOpen] = useState(false);
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
            fetchCommunications();
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
        const { data: insertedData, error: insertError } = await supabase
          .from('communications')
          .insert({
            ...cleanedData,
            parent_communication_id: null,
            thread_id: null,
            thread_position: 0
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
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

  const handleQuickReply = async (threadId: string, content: string, type: string) => {
    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;

      const lastMessage = thread.messages[thread.messages.length - 1];
      const firstMessage = thread.messages[0];
      
      const commType = type === 'call' ? 'phone' : type;
      
      // Get customer email for sending actual email
      const customerEmail = (firstMessage.customers as any)?.email;
      const customerName = (firstMessage.customers as any)?.contact_name || 
                          (firstMessage.customers as any)?.company_name || 'Valued Customer';
      
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

      // Insert communication record first
      const { data: insertedComm, error } = await supabase
        .from('communications')
        .insert([replyData])
        .select()
        .single();

      if (error) throw error;

      // If type is email and customer has email, send actual email
      if (commType === 'email' && customerEmail) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: customerEmail,
              subject: `Re: ${thread.subject}`,
              type: 'support_reply',
              data: {
                customerName,
                content,
                threadSubject: thread.subject,
                portalLink: 'https://trust-link-ventures-v2.lovable.app/portal',
              }
            }
          });

          if (emailError) {
            console.error('Failed to send email:', emailError);
            toast({
              title: "Warning",
              description: "Reply saved but email delivery failed",
              variant: "destructive",
            });
          } else {
            // Log email to email_logs
            await supabase.from('email_logs').insert({
              email_type: 'support_reply',
              recipient_email: customerEmail,
              subject: `Re: ${thread.subject}`,
              status: 'sent',
              customer_id: firstMessage.customers?.id,
              metadata: { communication_id: insertedComm?.id, thread_id: threadId }
            });
          }
        } catch (emailErr) {
          console.error('Email sending error:', emailErr);
        }
      }

      toast({
        title: "Success",
        description: commType === 'email' && customerEmail 
          ? "Reply sent and email delivered to customer" 
          : "Reply logged successfully",
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

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    return {
      all: threads.length,
      unread: threads.filter(t => t.hasUnread).length,
      contact_form: threads.filter(t => t.subject?.includes('Contact Form:')).length,
      email: threads.filter(t => t.messages.some(m => m.communication_type === 'email')).length,
      call: threads.filter(t => t.messages.some(m => m.communication_type === 'call' || m.communication_type === 'phone')).length,
      meeting: threads.filter(t => t.messages.some(m => m.communication_type === 'meeting')).length,
    };
  }, [threads]);

  const filteredThreads = useMemo(() => {
    return threads.filter(thread => {
      const matchesSearch = 
        thread.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thread.messages.some(msg => 
          msg.content?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        thread.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesType = true;
      if (typeFilter === 'unread') {
        matchesType = thread.hasUnread;
      } else if (typeFilter === 'contact_form') {
        matchesType = thread.subject?.includes('Contact Form:');
      } else if (typeFilter !== 'all') {
        matchesType = thread.messages.some(msg => 
          msg.communication_type === typeFilter || 
          (typeFilter === 'call' && msg.communication_type === 'phone')
        );
      }
      
      return matchesSearch && matchesType;
    });
  }, [threads, searchTerm, typeFilter]);

  const selectedThread = threads.find(t => t.id === selectedThreadId);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border bg-muted/20 p-4 shimmer h-28" />
          ))}
        </div>
        
        {/* Content Skeleton */}
        <div className="flex gap-4">
          <div className="flex-1 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border bg-muted/20 p-4 shimmer h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Communications Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage all customer conversations in one place
          </p>
        </div>
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

      {/* KPI Summary */}
      <CommunicationsKPISummary 
        threads={threads}
        communications={communications}
      />

      {/* Filters */}
      <CommunicationsFilters
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
        counts={filterCounts}
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-background"
        />
      </div>

      {/* Split Panel Layout - Desktop */}
      <div className="hidden lg:block h-[calc(100vh-420px)] min-h-[500px] rounded-xl border bg-card/50 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Thread List Panel */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {filteredThreads.length > 0 ? (
                  <AnimatePresence mode="popLayout">
                    {filteredThreads.map((thread, index) => (
                      <motion.div
                        key={thread.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <ThreadCardEnhanced
                          thread={thread}
                          isSelected={selectedThreadId === thread.id}
                          onClick={() => setSelectedThreadId(thread.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                ) : (
                  <CommunicationsEmptyState 
                    type={searchTerm || typeFilter !== 'all' ? 'no-results' : 'no-threads'}
                    searchTerm={searchTerm}
                    onCreateNew={() => setIsDialogOpen(true)}
                  />
                )}
              </div>
            </ScrollArea>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Conversation Panel */}
          <ResizablePanel defaultSize={60}>
            <AnimatePresence mode="wait">
              <ConversationPanel
                key={selectedThreadId || 'empty'}
                thread={selectedThread || null}
                onClose={() => setSelectedThreadId(null)}
                onReply={handleQuickReply}
              />
            </AnimatePresence>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-3">
        {!isMobileConversationOpen ? (
          <>
            {filteredThreads.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredThreads.map((thread, index) => (
                  <motion.div
                    key={thread.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ThreadCardEnhanced
                      thread={thread}
                      onClick={() => {
                        setSelectedThreadId(thread.id);
                        setIsMobileConversationOpen(true);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <CommunicationsEmptyState 
                type={searchTerm || typeFilter !== 'all' ? 'no-results' : 'no-threads'}
                searchTerm={searchTerm}
                onCreateNew={() => setIsDialogOpen(true)}
              />
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-50 bg-background"
          >
            <ConversationPanel
              thread={selectedThread || null}
              onClose={() => {
                setSelectedThreadId(null);
                setIsMobileConversationOpen(false);
              }}
              onReply={handleQuickReply}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CommunicationsManagement;
