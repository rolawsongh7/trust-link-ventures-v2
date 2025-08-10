import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Eye, Edit, FileText, UserPlus, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface QuoteRequest {
  id: string;
  request_type: 'customer' | 'lead';
  title: string;
  message: string;
  urgency: string;
  status: 'pending' | 'reviewed' | 'quoted' | 'converted' | 'declined';
  expected_delivery_date?: string;
  customer_id?: string;
  lead_company_name?: string;
  lead_contact_name?: string;
  lead_email?: string;
  lead_phone?: string;
  lead_country?: string;
  lead_industry?: string;
  admin_notes?: string;
  created_at: string;
  customer?: {
    company_name: string;
    contact_name: string;
    email: string;
  };
  quote_request_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    specifications?: string;
  }>;
}

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
}

const QuoteRequestManagement = () => {
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchQuoteRequests();
    fetchCustomers();
  }, []);

  const fetchQuoteRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          customer:customers(company_name, contact_name, email),
          quote_request_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      toast.error('Failed to fetch quote requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, email')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('quote_requests')
        .update({ 
          status,
          admin_notes: notes 
        })
        .eq('id', requestId);

      if (error) throw error;
      
      toast.success('Request status updated successfully');
      fetchQuoteRequests();
      setShowUpdateDialog(false);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request status');
    }
  };

  const convertQuoteRequestToLead = async (request: QuoteRequest) => {
    try {
      // 1. Create customer record from lead data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert({
          company_name: request.lead_company_name,
          contact_name: request.lead_contact_name,
          email: request.lead_email,
          phone: request.lead_phone,
          country: request.lead_country,
          industry: request.lead_industry
        })
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Create lead record
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          customer_id: customer.id,
          contact_name: request.lead_contact_name,
          email: request.lead_email,
          phone: request.lead_phone,
          company_name: request.lead_company_name,
          source: 'quote_request',
          status: 'new'
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // 3. Update quote request
      const { error: updateError } = await supabase
        .from('quote_requests')
        .update({ 
          status: 'converted',
          customer_id: customer.id 
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Quote request converted to lead successfully');
      fetchQuoteRequests();
    } catch (error) {
      console.error('Error converting to lead:', error);
      toast.error('Failed to convert quote request to lead');
    }
  };

  const createQuoteFromRequest = async (request: QuoteRequest) => {
    try {
      // 1. Create quote record
      const quoteData = {
        title: `Quote for: ${request.title}`,
        customer_id: request.customer_id,
        status: 'draft',
        quote_number: `Q-${Date.now()}`,
        total_amount: 0,
        currency: 'USD',
        notes: request.message,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (quoteError) throw quoteError;

      // 2. Copy items from quote request to quote
      if (request.quote_request_items && request.quote_request_items.length > 0) {
        const quoteItems = request.quote_request_items.map(item => ({
          quote_id: quote.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: 0,
          total_price: 0,
          product_description: item.specifications
        }));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      // 3. Update request status
      await updateRequestStatus(request.id, 'quoted');

      toast.success('Quote created from request successfully');
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Failed to create quote from request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'destructive';
      case 'reviewed': return 'secondary';
      case 'quoted': return 'default';
      case 'converted': return 'default';
      case 'declined': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'reviewed': return <Eye className="h-4 w-4" />;
      case 'quoted': return <FileText className="h-4 w-4" />;
      case 'converted': return <CheckCircle className="h-4 w-4" />;
      case 'declined': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredRequests = quoteRequests.filter(request => {
    const matchesSearch = 
      request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.lead_company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && request.status === activeTab;
  });

  const getTabCount = (status: string) => {
    if (status === 'all') return quoteRequests.length;
    return quoteRequests.filter(r => r.status === status).length;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Quote Request Management</h2>
        <p className="text-muted-foreground">Manage customer and lead quote requests</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({getTabCount('all')})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({getTabCount('pending')})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({getTabCount('reviewed')})</TabsTrigger>
          <TabsTrigger value="quoted">Quoted ({getTabCount('quoted')})</TabsTrigger>
          <TabsTrigger value="converted">Converted ({getTabCount('converted')})</TabsTrigger>
          <TabsTrigger value="declined">Declined ({getTabCount('declined')})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No quote requests found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Details</TableHead>
                      <TableHead>Customer/Lead Info</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{request.title}</div>
                            <Badge variant="outline" className="mt-1">
                              {request.request_type === 'lead' ? 'New Lead' : 'Existing Customer'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {request.request_type === 'lead' ? (
                              <>
                                <div className="font-medium text-sm">{request.lead_company_name}</div>
                                <div className="text-xs text-muted-foreground">{request.lead_contact_name}</div>
                                <div className="text-xs text-blue-600">{request.lead_email}</div>
                                {request.lead_phone && (
                                  <div className="text-xs text-muted-foreground">{request.lead_phone}</div>
                                )}
                                {request.lead_country && (
                                  <Badge variant="secondary" className="text-xs">
                                    {request.lead_country}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="font-medium text-sm">{request.customer?.company_name}</div>
                                <div className="text-xs text-muted-foreground">{request.customer?.contact_name}</div>
                                <div className="text-xs text-blue-600">{request.customer?.email}</div>
                                <Badge variant="default" className="text-xs">
                                  Customer ID: {request.customer_id?.slice(0, 8)}...
                                </Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status)} className="flex items-center gap-1 w-fit">
                            {getStatusIcon(request.status)}
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              request.urgency === 'critical' ? 'bg-red-500' :
                              request.urgency === 'high' ? 'bg-orange-500' :
                              request.urgency === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`} />
                            <span className="capitalize text-sm">{request.urgency}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {request.quote_request_items?.length || 0} item(s)
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setNewStatus(request.status);
                                setAdminNotes(request.admin_notes || '');
                                setShowUpdateDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {request.request_type === 'lead' && request.status !== 'converted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => convertQuoteRequestToLead(request)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            )}
                            {request.customer_id && request.status !== 'quoted' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createQuoteFromRequest(request)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quote Request Details</DialogTitle>
            <DialogDescription>
              View complete information about this quote request
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedRequest.request_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Badge variant={getStatusColor(selectedRequest.status)}>
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Urgency</label>
                  <Badge variant={selectedRequest.urgency === 'high' ? 'destructive' : 'secondary'}>
                    {selectedRequest.urgency}
                  </Badge>
                </div>
              </div>

              {selectedRequest.request_type === 'lead' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Company</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_company_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Contact</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_contact_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_country}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Industry</label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.lead_industry}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.customer?.company_name} - {selectedRequest.customer?.contact_name}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Message</label>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {selectedRequest.message}
                </p>
              </div>

              {selectedRequest.admin_notes && (
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              {selectedRequest.quote_request_items && selectedRequest.quote_request_items.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Requested Items</label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.quote_request_items.map((item) => (
                      <div key={item.id} className="bg-muted p-3 rounded">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} {item.unit}
                        </p>
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground">
                            Specifications: {item.specifications}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Quote Request</DialogTitle>
            <DialogDescription>
              Update the status and add admin notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="quoted">Quoted</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowUpdateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequest && updateRequestStatus(selectedRequest.id, newStatus, adminNotes)}
              >
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteRequestManagement;