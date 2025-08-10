import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Edit, Phone, Mail, Calendar, MessageSquare, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';

interface Communication {
  id: string;
  communication_type: string;
  subject: string;
  content: string;
  communication_date: string;
  created_at: string;
  customers?: {
    company_name: string;
  };
  leads?: {
    contact_name: string;
  };
}

interface Customer {
  id: string;
  company_name: string;
}

interface Lead {
  id: string;
  contact_name: string;
}

const CommunicationsManagement = () => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCommunication, setEditingCommunication] = useState<Communication | null>(null);
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
            contact_name
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
        .select('id, contact_name')
        .order('contact_name');

      if (error) throw error;
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingCommunication) {
        const { error } = await supabase
          .from('communications')
          .update(data)
          .eq('id', editingCommunication.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Communication updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('communications')
          .insert([data]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Communication logged successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingCommunication(null);
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

  const filteredCommunications = communications.filter(comm =>
    comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comm.leads?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Communications</h2>
          <p className="text-muted-foreground">Track all customer communications and interactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCommunication(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCommunication ? 'Edit Communication' : 'Log New Communication'}</DialogTitle>
              <DialogDescription>
                {editingCommunication ? 'Update communication details' : 'Record a customer interaction'}
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
                                {lead.contact_name}
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
      </div>

      <div className="space-y-4">
        {filteredCommunications.map((comm) => {
          const TypeIcon = getTypeIcon(comm.communication_type);
          return (
            <Card key={comm.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TypeIcon className="h-4 w-4" />
                      {comm.subject}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {(comm.customers?.company_name || comm.leads?.contact_name) && (
                        <CardDescription>
                          {comm.customers?.company_name || comm.leads?.contact_name}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={getTypeColor(comm.communication_type)}>
                      {comm.communication_type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {comm.content && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {comm.content}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(comm.created_at).toLocaleDateString()}
                      </div>
                      {comm.communication_date && (
                        <div>
                          Date: {new Date(comm.communication_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingCommunication(comm);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCommunications.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No communications found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No communications match your search criteria.' : 'Start logging customer communications.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Communication
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommunicationsManagement;