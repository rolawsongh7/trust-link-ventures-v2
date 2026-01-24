import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { Search, Plus, Eye, Edit, CheckCircle, XCircle, Clock, FileText, FileImage, Upload, Download, ThumbsUp, FileCheck, Mail, Trash2, HelpCircle, Package, Send, CircleDot, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import QuoteUploadDialog from './QuoteUploadDialog';
import { SimpleQuoteUpload } from './SimpleQuoteUpload';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable, Column } from '@/components/ui/data-table';
import { GenerateQuoteDialog } from './GenerateQuoteDialog';
import { QuotePreviewDialog } from './QuotePreviewDialog';
import { QuoteEditor } from './QuoteEditor';
import { QuoteWizard } from './wizard/QuoteWizard';
import { QuoteToOrderConverter } from './QuoteToOrderConverter';
import QuoteAuditTrail from './QuoteAuditTrail';
import { QuoteDetailsDialog } from './QuoteDetailsDialog';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  description?: string;
  total_amount: number;
  currency: string;
  status: string;
  origin_type: string;
  valid_until?: string;
  created_at: string;
  file_url?: string;
  final_file_url?: string;
  customer_email?: string;
  customer_id?: string;
  linked_quote_request_id?: string;
  supplier_quote_uploaded_at?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  customers?: {
    company_name: string;
    contact_name?: string;
    email?: string;
  };
  leads?: {
    title: string;
  };
  rfqs?: {
    id: string;
    status: string;
    deadline?: string;
  }[];
  orders?: {
    id: string;
    order_number: string;
    status: string;
  }[];
}

const UnifiedQuoteManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deletedQuotes, setDeletedQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [showQuoteWizard, setShowQuoteWizard] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedQuoteForUpload, setSelectedQuoteForUpload] = useState<Quote | null>(null);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedQuoteForGenerate, setSelectedQuoteForGenerate] = useState<Quote | null>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedQuoteForPreview, setSelectedQuoteForPreview] = useState<Quote | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [isConverterOpen, setIsConverterOpen] = useState(false);
  const [convertingQuote, setConvertingQuote] = useState<Quote | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedQuoteForDetails, setSelectedQuoteForDetails] = useState<string | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteTargetQuote, setInviteTargetQuote] = useState<Quote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [quoteToPermanentDelete, setQuoteToPermanentDelete] = useState<Quote | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      title: '',
      customer_id: '',
      total_amount: 0,
      currency: 'USD',
      status: 'draft',
      valid_until: '',
      description: '',
      notes: '',
      origin_type: 'manual'
    }
  });

  // Handle ?open=create query parameter for Quick Actions
  useEffect(() => {
    const openAction = searchParams.get('open');
    if (openAction === 'create') {
      setShowQuoteWizard(true);
      // Clean up URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle viewQuoteId from navigation state (from Dashboard Pending Quotes)
  useEffect(() => {
    const viewQuoteId = (location.state as any)?.viewQuoteId;
    if (viewQuoteId && !loading) {
      // Find the quote to ensure it exists
      const quoteExists = quotes.find(q => q.id === viewQuoteId) || 
                          deletedQuotes.find(q => q.id === viewQuoteId);
      if (quoteExists) {
        setSelectedQuoteForDetails(viewQuoteId);
        setIsDetailsDialogOpen(true);
        // Clear state to prevent re-triggering
        window.history.replaceState({}, '', '/admin/quotes');
      }
    }
  }, [quotes, deletedQuotes, location.state, loading]);

  useEffect(() => {
    fetchQuotes();
    fetchCustomers();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('quotes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        () => fetchQuotes()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateQuoteNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT-${year}${month}${day}-${random}`;
  };

  const onSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        quote_number: generateQuoteNumber(),
        total_amount: Number(data.total_amount)
      };

      const { error } = await supabase
        .from('quotes')
        .insert([submitData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote created successfully",
      });

      form.reset();
      fetchQuotes();
    } catch (error: any) {
      console.error('Error creating quote:', error);
      toast({
        title: "Error",
        description: "Failed to create quote",
        variant: "destructive",
      });
    }
  };

  const fetchQuotes = async () => {
    try {
      // Fetch active quotes with orders linked via both quote_id and source_quote_id
      const { data: activeData, error: activeError } = await supabase
        .from('quotes')
        .select(`
          *,
          customers(company_name, contact_name, email),
          leads(title),
          rfqs(id, status, deadline),
          orders_by_quote_id:orders!quote_id(id, order_number, status),
          orders_by_source:orders!source_quote_id(id, order_number, status)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (activeError) {
        console.error('Quote fetch error details:', {
          message: activeError.message,
          details: activeError.details,
          hint: activeError.hint,
          code: activeError.code
        });
        throw activeError;
      }
      
      // Merge the two orders arrays into a single 'orders' field for each quote
      const processedData = (activeData || []).map(quote => ({
        ...quote,
        orders: [
          ...(quote.orders_by_quote_id || []),
          ...(quote.orders_by_source || [])
        ].filter((order, index, self) => 
          // Remove duplicates by id
          index === self.findIndex(o => o.id === order.id)
        )
      }));
      
      setQuotes(processedData);

      // Fetch deleted quotes for trash
      const { data: deletedData, error: deletedError } = await supabase
        .from('quotes')
        .select(`
          *,
          customers(company_name, contact_name),
          leads(title)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (deletedError) {
        console.error('Deleted quotes fetch error:', deletedError);
      } else {
        setDeletedQuotes(deletedData || []);
      }
    } catch (error: any) {
      console.error('Full error object:', error);
      toast({
        title: "Error",
        description: `Failed to fetch quotes: ${error.message || 'Unknown error'}. Please check console for details.`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quote ${status === 'accepted' ? 'accepted and converted to order' : `marked as ${status}`}`,
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
    }
  };

  const generateTitlePage = async (quoteId: string) => {
    try {
      toast({
        title: "Generating title page...",
        description: "Please wait while we create the title page for your quote.",
      });

      const { data, error } = await supabase.functions.invoke('generate-quote-title-page', {
        body: { quoteId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Title page generated and merged with quote successfully",
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error generating title page:', error);
      toast({
        title: "Error",
        description: "Failed to generate title page",
        variant: "destructive",
      });
    }
  };

  const sendQuoteApprovalLink = async (quote: Quote) => {
    try {
      // CRITICAL: Validate PDF exists before sending
      if (!quote.final_file_url) {
        toast({
          title: 'Cannot send quote',
          description: 'Please generate the quote PDF first before sending to customer',
          variant: 'destructive'
        });
        return;
      }

      // Check if customer email is available
      let customerEmail = quote.customer_email || quote.customers?.email;
      
      // If still no email, fetch from customers table
      if (!customerEmail && quote.customers) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('email')
          .eq('id', quote.customer_id)
          .single();
        
        customerEmail = customerData?.email;
      }
      
      if (!customerEmail) {
        // Prompt for email as last resort
        customerEmail = prompt('Please enter the customer email address:');
        if (!customerEmail) return;
      }

      toast({
        title: "Sending quote email...",
        description: "Please wait while we send the quote to customer and admin.",
      });

      const { data, error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId: quote.id,
          customerEmail: customerEmail,
          customerName: quote.customers?.contact_name,
          companyName: quote.customers?.company_name
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to send email');
      }

      toast({
        title: "Success",
        description: `Quote sent to ${customerEmail} with PDF attachment. Copy sent to admin.`,
      });
      
      fetchQuotes();
    } catch (error: any) {
      console.error('Error sending quote approval link:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send quote approval link",
        variant: "destructive",
      });
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      // First approve the quote
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Get quote details to send to customer
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('*, customers(company_name, contact_name, email)')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Send to customer
      await sendQuoteApprovalLink(quote);

      toast({
        title: "Success",
        description: "Quote approved and sent to customer",
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve and send quote",
        variant: "destructive",
      });
    }
  };

  const downloadQuote = async (fileUrl: string, fileName: string) => {
    try {
      // Extract storage path from URL
      const urlParts = fileUrl.split('/quotes/');
      const storagePath = urlParts.length > 1 ? urlParts[1] : fileUrl.split('/').pop();
      
      if (!storagePath) {
        throw new Error('Invalid file path');
      }

      // Create signed URL for private bucket
      const { data, error } = await supabase.storage
        .from('quotes')
        .createSignedUrl(storagePath, 60); // 60 seconds expiry

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Failed to generate download URL');

      // Download using signed URL
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('Error downloading quote:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOriginTypeColor = (origin_type: string) => {
    switch (origin_type) {
      case 'direct': return 'bg-purple-100 text-purple-800';
      case 'rfq': return 'bg-orange-100 text-orange-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSoftDelete = async (quote: Quote) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id || null
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'Quote moved to trash',
        description: 'You can restore it from the Trash tab'
      });
      
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      fetchQuotes();
    } catch (error: any) {
      console.error('Error deleting quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quote',
        variant: 'destructive'
      });
    }
  };

  const handleRestore = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          deleted_at: null,
          deleted_by: null
        })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Quote restored',
        description: 'The quote has been restored successfully'
      });
      
      fetchQuotes();
    } catch (error: any) {
      console.error('Error restoring quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to restore quote',
        variant: 'destructive'
      });
    }
  };

  const handlePermanentDelete = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Quote permanently deleted',
        description: 'This action cannot be undone'
      });
      
      setPermanentDeleteDialogOpen(false);
      setQuoteToPermanentDelete(null);
      fetchQuotes();
    } catch (error: any) {
      console.error('Error permanently deleting quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quote permanently',
        variant: 'destructive'
      });
    }
  };

  const handleApprove = async (quote: Quote) => {
    if (!quote.final_file_url) {
      toast({
        title: 'Cannot approve',
        description: 'Final quote must be generated first',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: 'sent',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          sent_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (error) throw error;

      toast({
        title: 'Quote approved',
        description: 'Quote status updated to sent'
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error approving quote:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve quote',
        variant: 'destructive'
      });
    }
  };

  const columns: Column<Quote>[] = [
    {
      key: 'quote_number',
      label: 'Quote #',
      sortable: true,
      width: '150px',
      render: (value) => (
        <span className="font-mono font-semibold">{value}</span>
      )
    },
    {
      key: 'customers',
      label: 'Customer',
      sortable: false,
      width: '200px',
      render: (value: any, row) => (
        <div>
          <div className="font-medium">{value?.company_name || row.leads?.title || 'N/A'}</div>
          {value?.contact_name && (
            <div className="text-sm text-muted-foreground">{value.contact_name}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '150px',
      render: (value) => (
        <Badge className={getStatusColor(value as string)}>
          {value}
        </Badge>
      )
    },
    {
      key: 'total_amount',
      label: 'Amount',
      sortable: true,
      width: '150px',
      render: (value: any, row) => (
        <div className="font-semibold">
          {row.currency} {Number(value).toLocaleString()}
        </div>
      )
    },
    {
      key: 'final_file_url',
      label: 'Quote PDF',
      sortable: false,
      width: '250px',
      render: (value: any, row) => {
        if (!value) {
          // No PDF exists - show Generate PDF button for quotes with prices
          if (row.total_amount && row.total_amount > 0) {
            return (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedQuoteForGenerate(row);
                  setIsGenerateDialogOpen(true);
                }}
              >
                <FileCheck className="mr-1 h-3 w-3" />
                Generate PDF
              </Button>
            );
          }
          return (
            <Badge variant="secondary" className="text-xs">
              Add Prices First
            </Badge>
          );
        }
        
        // PDF exists - show preview and download
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedQuoteForPreview(row);
                setIsPreviewDialogOpen(true);
              }}
            >
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                downloadQuote(value, `quote-${row.quote_number}.pdf`);
              }}
            >
              <Download className="mr-1 h-3 w-3" />
              Download
            </Button>
          </div>
        );
      }
    }
  ];

  const filteredQuotes = quotes.filter(quote => {
    // Don't show quotes in trash tab filter (trash has its own view)
    if (selectedTab === 'trash') return false;
    
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || quote.status === selectedTab;
    
    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        variant="admin"
        title="Quotes Management"
        subtitle="Unified view of all quotes, RFQs, and order conversions"
        totalIcon={FileText}
        totalCount={quotes.length}
        stats={[
          { label: 'Pending', count: quotes.filter(q => q.status === 'pending').length, icon: Clock },
          { label: 'Sent', count: quotes.filter(q => q.status === 'sent').length, icon: Send },
          { label: 'Accepted', count: quotes.filter(q => q.status === 'accepted').length, icon: CheckCircle },
          { label: 'Draft', count: quotes.filter(q => q.status === 'draft').length, icon: CircleDot },
        ]}
      />
      
      <div className="flex gap-2 justify-end">
        <Button onClick={() => setShowQuoteWizard(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Quote Wizard
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({quotes.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({quotes.filter(q => q.status === 'draft').length})</TabsTrigger>
          <TabsTrigger value="pending_review">Pending Review ({quotes.filter(q => q.status === 'pending_review').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({quotes.filter(q => q.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({quotes.filter(q => q.status === 'sent').length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({quotes.filter(q => q.status === 'accepted').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({quotes.filter(q => q.status === 'rejected').length})</TabsTrigger>
          <TabsTrigger value="trash" className="text-destructive data-[state=active]:text-destructive">
            <Trash2 className="mr-1 h-3 w-3" />
            Trash ({deletedQuotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-6">
          <DataTable
            data={filteredQuotes}
            columns={columns}
            searchable={false}
            actions={(quote) => (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedQuoteForDetails(quote.id);
                    setIsDetailsDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details & Audit Trail
                </DropdownMenuItem>

                {/* Lock Edit Prices after quote is sent */}
                {(quote.status === 'draft' || quote.status === 'pending_review') ? (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingQuote(quote);
                      setIsEditorOpen(true);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Prices
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    <Edit className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Edit Prices (Locked - {quote.status})
                    </span>
                  </DropdownMenuItem>
                )}

                {quote.status === 'draft' && !quote.final_file_url && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!quote.total_amount || quote.total_amount === 0) {
                        toast({
                          title: 'Please edit prices first',
                          description: 'You need to set unit prices before generating the quote',
                          variant: 'destructive'
                        });
                        return;
                      }
                      setSelectedQuoteForGenerate(quote);
                      setIsGenerateDialogOpen(true);
                    }}
                    disabled={!quote.total_amount || quote.total_amount === 0}
                  >
                    <FileCheck className="mr-2 h-4 w-4" />
                    Generate Quote PDF
                  </DropdownMenuItem>
                )}
                
                {quote.status === 'pending_review' && quote.final_file_url && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuoteForPreview(quote);
                        setIsPreviewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Review & Approve
                    </DropdownMenuItem>
                  </>
                )}
                
                {/* Only allow sending if status is approved */}
                {quote.final_file_url && quote.status === 'approved' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      sendQuoteApprovalLink(quote);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Submit to Customer
                  </DropdownMenuItem>
                )}

                {/* Allow resending if already sent */}
                {quote.final_file_url && quote.status === 'sent' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      sendQuoteApprovalLink(quote);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Resend to Customer
                  </DropdownMenuItem>
                )}

                {/* Convert to Order - for manual quotes or approved quotes */}
                {(quote.status === 'approved' || quote.status === 'sent') && !quote.orders?.length && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConvertingQuote(quote);
                      setIsConverterOpen(true);
                    }}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Convert to Order
                  </DropdownMenuItem>
                )}

                {/* Show linked order info when order exists */}
                {quote.orders && quote.orders.length > 0 && (
                  <DropdownMenuItem disabled>
                    <Package className="mr-2 h-4 w-4 text-green-600" />
                    <span className="text-green-600">
                      Order: {quote.orders[0].order_number}
                    </span>
                  </DropdownMenuItem>
                )}

                {/* Show why action is disabled */}
                {!quote.final_file_url && (quote.status === 'draft' || quote.status === 'pending_review') && (
                  <DropdownMenuItem disabled>
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Submit to Customer (Generate PDF first)
                    </span>
                  </DropdownMenuItem>
                )}

                {quote.status === 'pending_review' && quote.final_file_url && (
                  <DropdownMenuItem disabled>
                    <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Submit to Customer (Approve quote first)
                    </span>
                  </DropdownMenuItem>
                )}

                {quote.final_file_url && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadQuote(quote.final_file_url!, `quote-${quote.quote_number}.pdf`);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Quote PDF
                  </DropdownMenuItem>
                )}

                {quote.customer_email && !quote.customer_id && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setInviteTargetQuote(quote);
                      setShowInviteDialog(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Invite to Portal
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuoteToDelete(quote);
                    setDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              </>
            )}
          />
        </TabsContent>

        {/* Trash Tab Content */}
        <TabsContent value="trash" className="mt-6">
          {deletedQuotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Trash is empty</h3>
                <p className="text-muted-foreground text-center">
                  Deleted quotes will appear here and can be restored.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Deleted Quotes ({deletedQuotes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deletedQuotes.map((quote) => (
                    <div
                      key={quote.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold">{quote.quote_number}</span>
                          <Badge variant="secondary">{quote.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {quote.customers?.company_name || quote.leads?.title || 'N/A'}
                          {quote.deleted_at && (
                            <span className="ml-2">
                              • Deleted {new Date(quote.deleted_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-medium mt-1">
                          {quote.currency} {Number(quote.total_amount).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(quote.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setQuoteToPermanentDelete(quote);
                            setPermanentDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete Forever
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <QuoteUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadComplete={fetchQuotes}
      />

      {selectedQuoteForUpload && (
        <SimpleQuoteUpload
          open={!!selectedQuoteForUpload}
          onOpenChange={(open) => !open && setSelectedQuoteForUpload(null)}
          quoteId={selectedQuoteForUpload.id}
          quoteNumber={selectedQuoteForUpload.quote_number}
          onSuccess={fetchQuotes}
        />
      )}

      {selectedQuoteForGenerate && (
        <GenerateQuoteDialog
          open={isGenerateDialogOpen}
          onOpenChange={setIsGenerateDialogOpen}
          quote={selectedQuoteForGenerate}
          onSuccess={fetchQuotes}
        />
      )}

      {selectedQuoteForPreview && (
        <QuotePreviewDialog
          open={isPreviewDialogOpen}
          onOpenChange={setIsPreviewDialogOpen}
          quote={selectedQuoteForPreview}
          onSuccess={fetchQuotes}
        />
      )}

      {editingQuote && (
        <QuoteEditor
          quoteId={editingQuote.id}
          quoteNumber={editingQuote.quote_number}
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          onSuccess={fetchQuotes}
        />
      )}

      {convertingQuote && (
        <QuoteToOrderConverter
          quote={convertingQuote}
          open={isConverterOpen}
          onOpenChange={setIsConverterOpen}
          onOrderCreated={fetchQuotes}
        />
      )}

      <QuoteWizard
        open={showQuoteWizard}
        onOpenChange={setShowQuoteWizard}
        onQuoteCreated={fetchQuotes}
      />

      <QuoteDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        quoteId={selectedQuoteForDetails}
      />

      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        defaultEmail={inviteTargetQuote?.customer_email || ''}
        defaultName={inviteTargetQuote?.customers?.contact_name || ''}
        sourceType="lead"
        sourceId={inviteTargetQuote?.id}
        onSuccess={() => {
          fetchQuotes();
          setShowInviteDialog(false);
        }}
      />

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move quote to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move quote <span className="font-semibold">{quoteToDelete?.quote_number}</span> to the trash.
              You can restore it later from the Trash tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quoteToDelete && handleSoftDelete(quoteToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete quote <span className="font-semibold">{quoteToPermanentDelete?.quote_number}</span>.
              <span className="block mt-2 font-semibold text-destructive">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => quoteToPermanentDelete && handlePermanentDelete(quoteToPermanentDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UnifiedQuoteManagement;