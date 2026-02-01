import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building, Mail, Phone, MapPin, Calendar, Plus, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { TrustSignalsCard, TrustHistoryPanel, TrustOverrideDialog } from '@/components/trust';
import type { TrustTier } from '@/utils/trustHelpers';
import { useCustomerTrust } from '@/hooks/useCustomerTrust';

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  industry?: string;
  customer_status: string;
  priority: string;
  country?: string;
  notes?: string;
  created_at: string;
}

interface CustomerDetailViewProps {
  customer: Customer;
  onBack: () => void;
}

interface Activity {
  id: string;
  activity_type: string;
  subject: string;
  description?: string;
  status: string;
  created_at: string;
}

interface Lead {
  id: string;
  contact_name: string;
  status: string;
  created_at: string;
}

interface Quote {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  ghana_digital_address: string;
  region: string;
  city: string;
  street_address: string;
  area?: string;
  is_default: boolean;
  created_at: string;
}

const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({ customer, onBack }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [logCommunicationOpen, setLogCommunicationOpen] = useState(false);
  const [trustOverrideOpen, setTrustOverrideOpen] = useState(false);
  const { toast } = useToast();
  const { data: trustProfile } = useCustomerTrust(customer.id);

  const leadForm = useForm({
    defaultValues: {
      contact_name: '',
      email: '',
      phone: '',
      notes: '',
      source: 'customer_request',
      status: 'new',
      lead_score: 70
    }
  });

  const communicationForm = useForm({
    defaultValues: {
      activity_type: 'call',
      subject: '',
      description: '',
      status: 'completed'
    }
  });

  useEffect(() => {
    fetchCustomerData();
  }, [customer.id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);
      
      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch leads - Note: there's no customer_id in leads table, using a different approach
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      // Fetch customer addresses
      const { data: addressesData } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customer.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      setActivities(activitiesData || []);
      setLeads((leadsData || []) as any);
      setQuotes(quotesData || []);
      setAddresses(addressesData || []);
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (data: any) => {
    try {
      const { error } = await supabase
        .from('leads')
        .insert([data]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead created successfully",
      });

      setCreateLeadOpen(false);
      leadForm.reset();
      fetchCustomerData();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to create lead",
        variant: "destructive",
      });
    }
  };

  const handleLogCommunication = async (data: any) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          ...data,
          customer_id: customer.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication logged successfully",
      });

      setLogCommunicationOpen(false);
      communicationForm.reset();
      fetchCustomerData();
    } catch (error) {
      console.error('Error logging communication:', error);
      toast({
        title: "Error",
        description: "Failed to log communication",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'new': return 'default';
      case 'qualified': return 'default';
      case 'closed': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{customer.company_name}</h2>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm">
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.filter(l => l.status !== 'closed').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quotes Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trust & Standing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrustSignalsCard 
          customerId={customer.id} 
          onOverrideClick={() => setTrustOverrideOpen(true)}
        />
        <TrustHistoryPanel customerId={customer.id} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Company Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{customer.company_name}</p>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                </div>
              </div>
              {customer.industry && (
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{customer.industry}</Badge>
                  <span className="text-sm text-muted-foreground">Industry</span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <Badge variant={getPriorityColor(customer.priority)}>{customer.priority}</Badge>
                <span className="text-sm text-muted-foreground">Priority</span>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant={getStatusColor(customer.customer_status)}>{customer.customer_status}</Badge>
                <span className="text-sm text-muted-foreground">Status</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Contact Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{customer.contact_name}</p>
                  <p className="text-sm text-muted-foreground">Primary Contact</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{customer.email}</p>
                  <p className="text-sm text-muted-foreground">Email</p>
                </div>
              </div>
              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{customer.phone}</p>
                    <p className="text-sm text-muted-foreground">Phone</p>
                  </div>
                </div>
              )}
              {customer.country && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{customer.country}</p>
                    <p className="text-sm text-muted-foreground">Country</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Addresses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Delivery Addresses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addresses.length > 0 ? (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="p-4 border rounded-lg bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{address.receiver_name}</p>
                        {address.is_default && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{address.phone_number}</p>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">📍 {address.ghana_digital_address}</p>
                    <p className="text-muted-foreground">{address.street_address}</p>
                    {address.area && <p className="text-muted-foreground">{address.area}</p>}
                    <p className="text-muted-foreground">{address.city}, {address.region}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Added {new Date(address.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No delivery addresses on file</p>
              <p className="text-xs mt-1">Customer will be prompted to add address when needed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <p className="text-sm text-muted-foreground">Common actions for this customer</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col space-y-2"
              onClick={() => setCreateLeadOpen(true)}
            >
              <Plus className="h-5 w-5" />
              <span>Create Lead</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col space-y-2"
              onClick={() => setLogCommunicationOpen(true)}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Log Communication</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={createLeadOpen} onOpenChange={setCreateLeadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Lead</DialogTitle>
            <DialogDescription>Create a new lead for {customer.company_name}</DialogDescription>
          </DialogHeader>
          <Form {...leadForm}>
            <form onSubmit={leadForm.handleSubmit(handleCreateLead)} className="space-y-4">
              <FormField
                control={leadForm.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={leadForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setCreateLeadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Lead</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Log Communication Dialog */}
      <Dialog open={logCommunicationOpen} onOpenChange={setLogCommunicationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>Record a communication activity for {customer.company_name}</DialogDescription>
          </DialogHeader>
          <Form {...communicationForm}>
            <form onSubmit={communicationForm.handleSubmit(handleLogCommunication)} className="space-y-4">
              <FormField
                control={communicationForm.control}
                name="activity_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Activity Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select activity type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={communicationForm.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={communicationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setLogCommunicationOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Log Communication</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Trust Override Dialog */}
      <TrustOverrideDialog
        open={trustOverrideOpen}
        onOpenChange={setTrustOverrideOpen}
        customerId={customer.id}
        customerName={customer.company_name}
        currentTier={(trustProfile?.trust_tier || 'new') as TrustTier}
      />
    </div>
  );
};

export default CustomerDetailView;