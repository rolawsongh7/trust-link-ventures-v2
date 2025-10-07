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
import { Search, Eye, Edit, FileText, UserPlus, X, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

interface QuoteRequest {
  id: string;
  quote_number?: string;
  request_type: string;
  title: string;
  message: string;
  urgency: string;
  status: string;
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
  updated_at: string;
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
    preferred_grade?: string;
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
      console.log('Updating request status:', { requestId, status, notes });
      console.log('Current user authentication status');
      
      const { data, error } = await supabase
        .from('quote_requests')
        .update({ 
          status,
          admin_notes: notes || null 
        })
        .eq('id', requestId)
        .select();

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Update successful, affected rows:', data?.length);
      toast.success('Request status updated successfully');
      fetchQuoteRequests(); // Refresh the data
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

  const handleDownloadPDF = async (request: QuoteRequest) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to download PDF');
        return;
      }

      const response = await fetch(
        `https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/download-quote-request-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweWZyZnRtZXh2Z25zeGxoZGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODQ3NzYsImV4cCI6MjA3MDM2MDc3Nn0.iF81frkpEqDyrA8Ntfv6-Eyoy7r_BK8rpW_w07mcRl4'
          },
          body: JSON.stringify({ quoteRequestId: request.id })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `quote-request-${request.quote_number || request.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const createQuoteFromRequest = async (request: QuoteRequest) => {
    try {
      // Determine customer info
      const customerEmail = request.lead_email || request.customer?.email;
      
      // 1. Create quote record WITH linked_quote_request_id
      const quoteData = {
        title: `Quote for: ${request.title}`,
        customer_id: request.customer_id,
        customer_email: customerEmail, // Store email for easy access
        linked_quote_request_id: request.id, // CRITICAL: Link to quote request
        status: 'draft',
        quote_number: `Q-${Date.now()}`,
        total_amount: 0,
        currency: 'USD',
        notes: request.message,
        description: `Quote generated from request: ${request.quote_number || request.id}`,
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
          product_description: item.specifications,
          specifications: item.preferred_grade
        }));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      // 3. Update request status
      await updateRequestStatus(request.id, 'quoted');

      toast.success('Quote created and linked to request! Add prices to complete it.');
      fetchQuoteRequests();
      
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
                       <TableHead>Quote #</TableHead>
                       <TableHead>Customer/Lead</TableHead>
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
                            <div className="text-sm font-mono text-blue-600">
                              {request.quote_number || `QR-${new Date(request.created_at).getFullYear()}${String(new Date(request.created_at).getMonth() + 1).padStart(2, '0')}-${request.id.slice(0, 8).toUpperCase()}`}
                            </div>
                          </TableCell>
                         <TableCell className="font-medium">
                           <div className="text-sm">
                             {request.request_type === 'lead' ? request.lead_company_name : request.customer?.company_name}
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
                                title="Create Quote"
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span>Quote Request Details</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedRequest && handleDownloadPDF(selectedRequest)}
                  className="ml-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
              {selectedRequest && (
                <div className="text-2xl font-bold font-mono text-primary bg-primary/10 px-4 py-2 rounded-lg border-2 border-primary/30">
                  {selectedRequest.quote_number || `QR-${new Date(selectedRequest.created_at).getFullYear()}${String(new Date(selectedRequest.created_at).getMonth() + 1).padStart(2, '0')}-${selectedRequest.id.slice(0, 8).toUpperCase()}`}
                </div>
              )}
            </DialogTitle>
            <DialogDescription>
              View complete information about this quote request
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {selectedRequest && (
              <div className="space-y-4 pb-4">
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
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead>Preferred Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRequest.quote_request_items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>{item.specifications || '-'}</TableCell>
                          <TableCell>{item.preferred_grade || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => selectedRequest && handleDownloadPDF(selectedRequest)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </ScrollArea>
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