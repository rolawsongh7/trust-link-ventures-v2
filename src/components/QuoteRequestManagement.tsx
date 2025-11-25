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
import { Search, Eye, Edit, FileText, UserPlus, X, CheckCircle, Clock, AlertCircle, Download, Building, Package, Calendar, MessageSquare, Filter, CircleDot, RefreshCw, Mail } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';

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
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteTargetRequest, setInviteTargetRequest] = useState<QuoteRequest | null>(null);

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

  const handlePreviewClick = async (request: QuoteRequest) => {
    setLoadingItems(true);
    
    // Re-fetch full details if items are missing
    if (!request.quote_request_items || request.quote_request_items.length === 0) {
      try {
        const { data, error } = await supabase
          .from('quote_requests')
          .select(`
            *,
            customer:customers(company_name, contact_name, email),
            quote_request_items(*)
          `)
          .eq('id', request.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setSelectedRequest(data);
        }
      } catch (error) {
        console.error('Error fetching request details:', error);
        toast.error('Failed to load request details');
      }
    } else {
      setSelectedRequest(request);
    }
    
    setLoadingItems(false);
    setShowDetailsDialog(true);
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

  const formatQuoteNumber = (request: QuoteRequest) => {
    return `QR-${new Date(request.created_at).getFullYear()}${String(new Date(request.created_at).getMonth() + 1).padStart(2, '0')}-${request.id.slice(0, 8).toUpperCase()}`;
  };

  const getEnhancedStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gradient-to-r from-[#A855F7] to-[#9333EA] text-white shadow-md';
      case 'reviewed':
        return 'bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white shadow-md';
      case 'quoted':
        return 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-md';
      case 'converted':
        return 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white shadow-md';
      case 'declined':
        return 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-md';
      default:
        return 'bg-gradient-to-r from-[#64748B] to-[#475569] text-white shadow-md';
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
    <div className="space-y-6 min-h-screen bg-[#F8FAFC] p-6">
      {/* Premium Gradient Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#0EA5E9] p-4 sm:p-6 md:p-8 mb-6 shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)'
        }} />
        
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
            Customer Quote Inquiries
          </h1>
          <p className="text-blue-100 text-base sm:text-lg">
            Manage and respond to all customer quote requests
          </p>
        </div>
      </div>

      {/* Frosted Glass Filter Container */}
      <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-6 shadow-lg space-y-4">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#64748B] h-5 w-5" />
            <Input
              placeholder="Search by company, title, or quote number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-10 sm:h-12 text-base rounded-xl border-[#E2E8F0] focus:border-[#3B82F6] transition-all"
            />
          </div>
        </div>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 w-full bg-[#F1F5F9] p-1 rounded-xl h-auto">
            <TabsTrigger 
              value="all"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B82F6] data-[state=active]:to-[#0EA5E9] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                All
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('all')}</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="pending"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#A855F7] data-[state=active]:to-[#9333EA] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Pending</span>
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('pending')}</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="reviewed"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#3B82F6] data-[state=active]:to-[#0EA5E9] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Reviewed</span>
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('reviewed')}</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="quoted"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#22C55E] data-[state=active]:to-[#16A34A] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Quoted</span>
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('quoted')}</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="converted"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#F59E0B] data-[state=active]:to-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Converted</span>
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('converted')}</Badge>
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="declined"
              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#EF4444] data-[state=active]:to-[#DC2626] data-[state=active]:text-white data-[state=active]:shadow-md transition-all py-3"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <X className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Declined</span>
                <Badge className="bg-white/20 text-current border-none text-xs">{getTabCount('declined')}</Badge>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredRequests.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-12 text-center shadow-lg border border-white/20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3B82F6]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No quote requests found</h3>
                <p className="text-[#64748B]">Try adjusting your filters or search terms</p>
              </div>
            ) : (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b-2 border-[#E2E8F0] hover:bg-transparent">
                        <TableHead className="font-semibold text-[#0F172A] text-sm py-4">Quote #</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Customer/Lead</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Status</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Urgency</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Items</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Created</TableHead>
                        <TableHead className="font-semibold text-[#0F172A] text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow 
                          key={request.id}
                          className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC] transition-colors group"
                        >
                          <TableCell className="font-medium py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#0EA5E9] flex items-center justify-center flex-shrink-0">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-mono text-sm text-[#3B82F6] font-semibold">
                                {request.quote_number || formatQuoteNumber(request)}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6]/20 to-[#0EA5E9]/20 flex items-center justify-center flex-shrink-0">
                                <Building className="h-5 w-5 text-[#3B82F6]" />
                              </div>
                              <div>
                                <p className="font-semibold text-[#0F172A] text-sm">
                                  {request.request_type === 'lead' ? request.lead_company_name : request.customer?.company_name}
                                </p>
                                <p className="text-xs text-[#64748B]">
                                  {request.request_type === 'lead' ? request.lead_contact_name : request.customer?.contact_name}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={`px-3 py-1.5 rounded-full font-medium text-xs flex items-center gap-1.5 w-fit ${getEnhancedStatusStyle(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="capitalize">{request.status}</span>
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full animate-pulse ${
                                request.urgency === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                request.urgency === 'high' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                request.urgency === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                                'bg-gradient-to-br from-green-500 to-green-600'
                              }`} />
                              <span className="capitalize text-sm text-[#475569] font-medium">
                                {request.urgency}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-4 w-4 text-[#64748B]" />
                              <span className="font-semibold text-[#0F172A]">
                                {request.quote_request_items?.length || 0}
                              </span>
                              <span className="text-[#64748B]">items</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-[#64748B]">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(request.created_at), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreviewClick(request)}
                                className="h-9 w-9 p-0 hover:bg-[#EFF6FF] hover:text-[#3B82F6] rounded-lg transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setNewStatus(request.status);
                                  setAdminNotes(request.admin_notes || '');
                                  setShowUpdateDialog(true);
                                }}
                                className="h-9 w-9 p-0 hover:bg-[#EFF6FF] hover:text-[#3B82F6] rounded-lg transition-all"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              {request.request_type === 'lead' && request.status !== 'converted' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => convertQuoteRequestToLead(request)}
                                  className="h-9 w-9 p-0 hover:bg-[#F0FDF4] hover:text-[#22C55E] rounded-lg transition-all"
                                  title="Convert to Lead"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {request.customer_id && request.status !== 'quoted' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => createQuoteFromRequest(request)}
                                  className="h-9 w-9 p-0 hover:bg-[#F0F9FF] hover:text-[#0EA5E9] rounded-lg transition-all"
                                  title="Create Quote"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}

                              {request.lead_email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setInviteTargetRequest(request);
                                    setShowInviteDialog(true);
                                  }}
                                  className="h-9 w-9 p-0 hover:bg-[#EFF6FF] hover:text-[#3B82F6] rounded-lg transition-all"
                                  title="Invite to Portal"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadPDF(request)}
                                className="h-9 w-9 p-0 hover:bg-[#FEF3C7] hover:text-[#F59E0B] rounded-lg transition-all"
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-white/95 backdrop-blur-xl border-2 border-white/20 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">Quote Request Details</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedRequest && handlePreviewClick(selectedRequest)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2"
                    disabled={loadingItems}
                  >
                    {loadingItems ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => selectedRequest && handleDownloadPDF(selectedRequest)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
              {selectedRequest && (
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 w-fit">
                  <FileText className="h-5 w-5 text-white" />
                  <span className="text-xl font-bold font-mono text-white">
                    {selectedRequest.quote_number || formatQuoteNumber(selectedRequest)}
                  </span>
                </div>
              )}
            </DialogTitle>
            <DialogDescription className="text-blue-100">
              Complete information about this quote request
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            {selectedRequest && (
              <div className="space-y-6 pb-4">
                {/* Status & Urgency Bar */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Status</label>
                    <Badge className={`mt-1 ${getEnhancedStatusStyle(selectedRequest.status)}`}>
                      {getStatusIcon(selectedRequest.status)}
                      <span className="capitalize ml-1">{selectedRequest.status}</span>
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Urgency</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        selectedRequest.urgency === 'critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                        selectedRequest.urgency === 'high' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                        selectedRequest.urgency === 'medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-br from-green-500 to-green-600'
                      }`} />
                      <span className="capitalize font-semibold text-[#0F172A]">{selectedRequest.urgency}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Type</label>
                    <p className="text-sm font-semibold text-[#0F172A] mt-1 capitalize">{selectedRequest.request_type}</p>
                  </div>
                </div>

                {/* Customer/Lead Info Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
                  <h3 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-[#3B82F6]" />
                    {selectedRequest.request_type === 'lead' ? 'Lead Information' : 'Customer Information'}
                  </h3>
                  
                  {selectedRequest.request_type === 'lead' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Company</label>
                        <p className="text-sm font-semibold text-[#0F172A]">{selectedRequest.lead_company_name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Contact</label>
                        <p className="text-sm font-semibold text-[#0F172A]">{selectedRequest.lead_contact_name}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Email</label>
                        <p className="text-sm text-[#475569]">{selectedRequest.lead_email}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Phone</label>
                        <p className="text-sm text-[#475569]">{selectedRequest.lead_phone}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Country</label>
                        <p className="text-sm text-[#475569]">{selectedRequest.lead_country}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide">Industry</label>
                        <p className="text-sm text-[#475569]">{selectedRequest.lead_industry}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3B82F6]/20 to-[#0EA5E9]/20 flex items-center justify-center">
                        <Building className="h-7 w-7 text-[#3B82F6]" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-[#0F172A]">{selectedRequest.customer?.company_name}</p>
                        <p className="text-sm text-[#64748B]">{selectedRequest.customer?.contact_name}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Card */}
                <div className="bg-gradient-to-br from-[#F8FAFC] to-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
                  <label className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Customer Message
                  </label>
                  <p className="text-sm text-[#475569] leading-relaxed">{selectedRequest.message}</p>
                </div>

                {/* Admin Notes (if exist) */}
                {selectedRequest.admin_notes && (
                  <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] rounded-xl p-6 border border-[#F59E0B]/30 shadow-sm">
                    <label className="text-xs font-medium text-[#92400E] uppercase tracking-wide mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Admin Notes
                    </label>
                    <p className="text-sm text-[#78350F] leading-relaxed">{selectedRequest.admin_notes}</p>
                  </div>
                )}

                {/* Requested Items Table */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
                  <h3 className="font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-[#3B82F6]" />
                    Requested Items ({selectedRequest.quote_request_items?.length || 0})
                  </h3>
                  
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                      <p className="ml-3 text-gray-600">Loading items...</p>
                    </div>
                  ) : !selectedRequest.quote_request_items || selectedRequest.quote_request_items.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>No items found. Try clicking Refresh to reload data.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#F8FAFC]">
                            <TableHead className="font-semibold text-[#0F172A]">Product</TableHead>
                            <TableHead className="font-semibold text-[#0F172A]">Quantity</TableHead>
                            <TableHead className="font-semibold text-[#0F172A]">Unit</TableHead>
                            <TableHead className="font-semibold text-[#0F172A]">Specifications</TableHead>
                            <TableHead className="font-semibold text-[#0F172A]">Grade</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRequest.quote_request_items.map((item, index) => (
                            <TableRow key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}>
                              <TableCell className="font-medium text-[#0F172A]">{item.product_name}</TableCell>
                              <TableCell className="text-[#475569]">{item.quantity}</TableCell>
                              <TableCell className="text-[#475569]">{item.unit}</TableCell>
                              <TableCell className="text-[#64748B] text-sm">{item.specifications || '-'}</TableCell>
                              <TableCell className="text-[#64748B] text-sm">{item.preferred_grade || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-xl border-2 border-white/20 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-2xl font-bold text-white">Update Quote Request</DialogTitle>
            <DialogDescription className="text-blue-100">
              Update the status and add internal notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-[#3B82F6]" />
                Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="h-12 rounded-xl border-[#E2E8F0] focus:border-[#3B82F6] transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending" className="py-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-purple-500" />
                      <span>Pending</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="reviewed" className="py-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span>Reviewed</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="quoted" className="py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <span>Quoted</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="converted" className="py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-yellow-500" />
                      <span>Converted</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="declined" className="py-3">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span>Declined</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Admin Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#3B82F6]" />
                Admin Notes
              </label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes about this request..."
                rows={4}
                className="rounded-xl border-[#E2E8F0] focus:border-[#3B82F6] transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpdateDialog(false)}
                className="h-11 px-6 rounded-xl border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequest && updateRequestStatus(selectedRequest.id, newStatus, adminNotes)}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] hover:from-[#2563EB] hover:to-[#0284C7] text-white shadow-lg transition-all"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Update Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        defaultEmail={inviteTargetRequest?.lead_email || ''}
        defaultName={inviteTargetRequest?.lead_contact_name || ''}
        sourceType="quote_request"
        sourceId={inviteTargetRequest?.id}
        onSuccess={() => {
          fetchQuoteRequests();
        }}
      />
    </div>
  );
};

export default QuoteRequestManagement;