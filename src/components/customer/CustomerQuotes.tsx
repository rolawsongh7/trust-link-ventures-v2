import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Search, Download, Eye, Calendar, DollarSign, Clock, Package, LayoutGrid, Table as TableIcon, FileCheck } from 'lucide-react';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { CustomerQuotePDFDialog } from './CustomerQuotePDFDialog';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomerQuotesTable } from './CustomerQuotesTable';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ConsolidatedQuoteAcceptanceDialog } from './ConsolidatedQuoteAcceptanceDialog';


interface QuoteItem {
  id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
}

interface Quote {
  id: string;
  title: string;
  message?: string;
  status: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  quote_request_items?: any[];
  // Final quote information
  final_quote?: {
    id: string;
    quote_number: string;
    status: string;
    total_amount: number;
    currency: string;
    valid_until?: string;
    final_file_url?: string;
    sent_at?: string;
    customer_email?: string;
    quote_items?: QuoteItem[];
  };
}

export const CustomerQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentQuote, setSelectedPaymentQuote] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAcceptanceDialog, setShowAcceptanceDialog] = useState(false);
  const [quoteToAccept, setQuoteToAccept] = useState<any>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState<Quote | null>(null);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Force card view on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('cards');
    }
  }, [isMobile]);

  useEffect(() => {
    fetchQuotes();
  }, [profile]);

  const fetchQuotes = async () => {
    if (!profile?.email) {
      console.warn('⚠️ No profile email found');
      setLoading(false);
      return;
    }

    console.log('🔍 fetchQuotes - Starting for:', profile.email);

    try {
      // Fetch quote requests with case-insensitive email matching
      const { data: quoteRequests, error: requestsError } = await supabase
        .from('quote_requests')
        .select(`
          *,
          quote_request_items (*)
        `)
        .ilike('lead_email', profile.email)  // Case-insensitive
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('❌ Error fetching quote requests:', requestsError);
        throw requestsError;
      }

      console.log('✅ Quote requests found:', quoteRequests?.length || 0);

      // Fetch linked final quotes with items
      let finalQuotes = [];
      
      if (quoteRequests && quoteRequests.length > 0) {
        // Customer has quote requests - fetch quotes by email OR linked request IDs
        const { data, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            id, 
            quote_number, 
            status, 
            total_amount, 
            currency, 
            valid_until, 
            final_file_url, 
            sent_at, 
            linked_quote_request_id, 
            customer_email,
            quote_items (
              id,
              product_name,
              product_description,
              quantity,
              unit,
              unit_price,
              total_price,
              specifications
            )
          `)
          .or(`customer_email.eq.${profile.email},linked_quote_request_id.in.(${quoteRequests.map(q => q.id).join(',')})`);

        if (quotesError) throw quotesError;
        finalQuotes = data || [];
      } else {
        // New customer - only check for quotes by email (in case admin created one directly)
        const { data, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            id, 
            quote_number, 
            status, 
            total_amount, 
            currency, 
            valid_until, 
            final_file_url, 
            sent_at, 
            linked_quote_request_id, 
            customer_email,
            quote_items (
              id,
              product_name,
              product_description,
              quantity,
              unit,
              unit_price,
              total_price,
              specifications
            )
          `)
          .eq('customer_email', profile.email);

        if (quotesError) throw quotesError;
        finalQuotes = data || [];
      }

      // Merge quote requests with their final quotes
      // IMPORTANT: Prioritize linked_quote_request_id to avoid duplicate matches
      const mergedData = quoteRequests?.map(request => {
        // First, try to find by linked_quote_request_id (most accurate)
        let finalQuote = finalQuotes?.find(q => q.linked_quote_request_id === request.id);
        
        // Only fall back to email matching if no linked quote exists
        // AND if this quote hasn't already been linked to another request
        if (!finalQuote) {
          const usedQuoteIds = quoteRequests
            .map(r => finalQuotes?.find(q => q.linked_quote_request_id === r.id)?.id)
            .filter(Boolean);
          
          finalQuote = finalQuotes?.find(q => 
            !usedQuoteIds.includes(q.id) &&
            q.customer_email === request.lead_email &&
            !q.linked_quote_request_id
          );
        }
        
        return {
          ...request,
          final_quote: finalQuote || undefined,
          // Update status based on final quote if available
          status: finalQuote ? 
            (finalQuote.status === 'sent' ? 'quoted' : 
             finalQuote.status === 'accepted' ? 'approved' : 
             request.status) : 
            request.status
        };
      }) || [];

      setQuotes(mergedData);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quotes. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'quoted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleApproveQuote = (finalQuote: any) => {
    console.log('handleApproveQuote called with:', finalQuote);
    console.log('finalQuote.id:', finalQuote?.id);
    
    // Validate that we have a complete quote object
    if (!finalQuote || !finalQuote.id) {
      console.error('Invalid quote object:', finalQuote);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to process quote. Please refresh the page and try again.",
      });
      return;
    }

    setQuoteToAccept({
      id: finalQuote.id,
      quote_number: finalQuote.quote_number,
      total_amount: finalQuote.total_amount,
      currency: finalQuote.currency,
      customer_id: profile?.id
    });
    setShowAcceptanceDialog(true);
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'rejected' })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Quote Rejected",
        description: "We've recorded your response. We'll be in touch if needed.",
      });

      fetchQuotes(); // Refresh the list
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject quote. Please try again.",
      });
    }
  };

  const downloadQuote = async (fileUrl: string, quoteNumber: string) => {
    try {
      console.log('Attempting to download quote PDF:', fileUrl);
      
      // Ensure we have a signed URL
      const secureUrl = await ensureSignedUrl(fileUrl);
      
      // Fetch the file as a blob
      const response = await fetch(secureUrl);
      
      if (!response.ok) {
        throw new Error(`File not found: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading ${quoteNumber}`,
      });
    } catch (error) {
      console.error('Error downloading quote:', error);
      toast({
        variant: "destructive",
        title: "Failed to download quote",
        description: error instanceof Error ? error.message : "Unable to download the quote. The file may not exist.",
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            My Quote Requests
          </h1>
          <p className="text-muted-foreground">
            Track your quote requests and their status
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <FileText className="h-4 w-4 mr-2" />
          {filteredQuotes.length} Quotes
        </Badge>
      </div>

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>

            {/* View Toggle - Desktop only */}
            {!isMobile && (
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="flex-1"
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="flex-1"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Cards
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No quotes found</h3>
            <p className="text-muted-foreground mb-6">
              {quotes.length === 0 
                ? "You haven't submitted any quote requests yet." 
                : "No quotes match your current filters."
              }
            </p>
            {quotes.length === 0 && (
              <Button asChild>
                <a href="/customer/catalog">Browse Products</a>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <CustomerQuotesTable
          quotes={filteredQuotes}
          onApprove={handleApproveQuote}
          onReject={handleRejectQuote}
          onDownload={(url) => downloadQuote(url, 'quote')}
        />
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary overflow-hidden">
              <div className="bg-gradient-to-r from-primary/5 to-transparent p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-3 font-bold text-foreground flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      {quote.title}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-full">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-background/50 px-3 py-1 rounded-full">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(quote.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getUrgencyColor(quote.urgency)} px-3 py-1 text-sm font-semibold`}>
                      {quote.urgency}
                    </Badge>
                    <Badge className={`${getStatusColor(quote.status)} px-3 py-1 text-sm font-semibold`}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 pt-4">
                {quote.message && (
                  <p className="text-muted-foreground mb-4 italic border-l-2 border-muted pl-4">{quote.message}</p>
                )}
                
                {/* Final Quote Info - Enhanced */}
                {quote.final_quote && (
                  <div className="mb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg text-primary flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Final Quote Available
                      </h4>
                      <Badge variant="outline" className="bg-primary/20 border-primary/40 text-primary font-mono text-sm px-3 py-1">
                        {quote.final_quote.quote_number}
                      </Badge>
                    </div>
                    
                    {/* Quote Items Table */}
                    {quote.final_quote.quote_items && quote.final_quote.quote_items.length > 0 && (
                      <div className="bg-white/90 dark:bg-background/90 rounded-lg overflow-hidden mb-4">
                        <table className="w-full text-sm">
                          <thead className="bg-primary/10 border-b-2 border-primary/20">
                            <tr>
                              <th className="text-left p-3 font-semibold text-foreground">Item</th>
                              <th className="text-right p-3 font-semibold text-foreground">Qty</th>
                              <th className="text-right p-3 font-semibold text-foreground">Unit Price</th>
                              <th className="text-right p-3 font-semibold text-foreground">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-muted">
                            {quote.final_quote.quote_items.map((item, index) => (
                              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3">
                                  <div className="font-medium text-foreground">{item.product_name}</div>
                                  {item.product_description && (
                                    <div className="text-xs text-muted-foreground mt-0.5">{item.product_description}</div>
                                  )}
                                  {item.specifications && (
                                    <div className="text-xs text-muted-foreground italic mt-0.5">{item.specifications}</div>
                                  )}
                                </td>
                                <td className="p-3 text-right font-medium text-foreground whitespace-nowrap">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="p-3 text-right font-medium text-foreground">
                                  {quote.final_quote.currency} {item.unit_price.toLocaleString()}
                                </td>
                                <td className="p-3 text-right font-semibold text-foreground">
                                  {quote.final_quote.currency} {item.total_price.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-primary/5 border-t-2 border-primary/30">
                            <tr>
                              <td colSpan={3} className="p-3 text-right font-bold text-foreground">Total Amount:</td>
                              <td className="p-3 text-right">
                                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                  {quote.final_quote.currency} {quote.final_quote.total_amount?.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                    
                    {quote.final_quote.valid_until && (
                      <div className="bg-white/80 dark:bg-background/80 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Valid Until:
                          </span>
                          <span className="text-sm font-semibold">
                            {new Date(quote.final_quote.valid_until).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {quote.final_quote.status === 'sent' && (
                      <div className="flex gap-3">
                        <Button 
                          size="lg" 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => handleApproveQuote(quote.final_quote!)}
                        >
                          <span className="text-lg mr-2">✓</span>
                          Accept Quote
                        </Button>
                        <Button 
                          size="lg" 
                          variant="destructive"
                          className="flex-1 shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => handleRejectQuote(quote.final_quote!.id)}
                        >
                          <span className="text-lg mr-2">✗</span>
                          Reject Quote
                        </Button>
                      </div>
                    )}
                    
                    {quote.final_quote.status === 'accepted' && (
                      <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
                        <p className="text-green-800 dark:text-green-300 font-bold text-base flex items-center gap-2">
                          <span className="text-xl">✓</span>
                          Quote Approved Successfully
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400 mt-1">See payment instructions below</p>
                      </div>
                    )}
                  </div>
                )}

                {quote.quote_request_items && quote.quote_request_items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <Package className="h-4 w-4 text-primary" />
                      Items Requested:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {quote.quote_request_items.slice(0, 4).map((item, index) => (
                        <div key={index} className="text-sm bg-gradient-to-r from-muted/80 to-muted/40 p-3 rounded-lg border border-muted-foreground/10">
                          <span className="font-semibold text-foreground">{item.product_name}</span>
                          <span className="text-muted-foreground ml-2 font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                      {quote.quote_request_items.length > 4 && (
                        <div className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                          <span>+{quote.quote_request_items.length - 4} more items</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="shadow-sm hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedQuote(quote);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {quote.final_quote?.final_file_url && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-all"
                        onClick={() => {
                          setSelectedQuoteForPDF(quote);
                          setPdfDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-all"
                        onClick={() => downloadQuote(quote.final_quote!.final_file_url!, quote.final_quote!.quote_number)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Quote
                      </Button>
                    </>
                  )}
                  
          {(quote.status === 'approved' || quote.final_quote?.status === 'accepted') && quote.final_quote && (
                    <div className="w-full mt-4 bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-100/50 dark:from-blue-950/40 dark:via-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-md">
                      <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-3 text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Payment Options
                      </h4>
                      <div className="space-y-4 text-sm">
                        {/* Option 1: Bank Transfer */}
                        <div className="bg-white dark:bg-background p-4 rounded-lg border-2 border-blue-200 dark:border-blue-700 shadow-sm">
                          <p className="font-bold text-blue-900 dark:text-blue-200 mb-2">Option 1: Bank Transfer</p>
                          <div className="space-y-1.5 text-blue-800 dark:text-blue-300">
                            <p><strong className="inline-block min-w-[120px]">Bank:</strong> Trust Link Bank Ghana</p>
                            <p><strong className="inline-block min-w-[120px]">Account Name:</strong> Trust Link Ventures Limited</p>
                            <p><strong className="inline-block min-w-[120px]">Account #:</strong> 1234567890</p>
                            <p><strong className="inline-block min-w-[120px]">Swift Code:</strong> TLBKGHAC</p>
                          </div>
                        </div>

                        {/* Option 2: Mobile Money */}
                        <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800 shadow-sm">
                          <p className="font-bold text-green-900 dark:text-green-200 mb-2">Option 2: Mobile Money (Ghana)</p>
                          <div className="space-y-1.5 text-green-800 dark:text-green-300">
                            <p><strong className="inline-block min-w-[120px]">Account Name:</strong> Trust Link Ventures Limited</p>
                            <p><strong className="inline-block min-w-[120px]">MTN MoMo:</strong> +233 24 123 4567</p>
                            <p><strong className="inline-block min-w-[120px]">Vodafone Cash:</strong> +233 20 123 4567</p>
                            <p><strong className="inline-block min-w-[120px]">AirtelTigo:</strong> +233 27 123 4567</p>
                          </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-yellow-900 dark:text-yellow-200 text-sm mb-3">
                            <strong>Important:</strong> Choose ONE payment method and include reference <span className="font-mono font-bold">{quote.final_quote.quote_number}</span>
                          </p>
                          <div className="border-t border-blue-200 dark:border-blue-700 my-3"></div>
                          <p className="text-blue-900 dark:text-blue-200 font-bold text-base">
                            <strong>Total Amount:</strong> 
                            <span className="text-xl ml-2">{quote.final_quote.currency} {quote.final_quote.total_amount?.toLocaleString()}</span>
                          </p>
                          <p className="text-blue-800 dark:text-blue-300 font-mono bg-blue-100 dark:bg-blue-900/30 p-2 rounded mt-2">
                            <strong>Reference:</strong> {quote.final_quote.quote_number}
                          </p>
                          <p className="text-amber-900 dark:text-amber-300 text-xs mt-3">
                            📧 Send payment confirmation to <strong>info@trustlinkventures.com</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Instructions Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Payment Instructions
            </DialogTitle>
          </DialogHeader>
          
          {selectedPaymentQuote && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200 dark:border-green-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-xl">✓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Quote Approved!</h3>
                    <p className="text-sm text-muted-foreground">Quote #{selectedPaymentQuote.quote_number}</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  Total: {selectedPaymentQuote.currency} {selectedPaymentQuote.total_amount?.toLocaleString()}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Bank Transfer Details
                </h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Bank Name:</span>
                    <span className="font-semibold">Trust Link Bank Ghana</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Account Name:</span>
                    <span className="font-semibold">Trust Link Ventures Limited</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Account Number:</span>
                    <span className="font-semibold font-mono">1234567890</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Swift Code:</span>
                    <span className="font-semibold font-mono">TLBKGHAC</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Reference:</span>
                    <span className="font-semibold font-mono">{selectedPaymentQuote.quote_number}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h5 className="font-semibold mb-2 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Important Notes:
                </h5>
                <ul className="text-sm space-y-1 ml-7 list-disc text-muted-foreground">
                  <li>Please include the quote number ({selectedPaymentQuote.quote_number}) in your payment reference</li>
                  <li>Payment must be received within 7 days to maintain pricing</li>
                  <li>An order will be created automatically upon payment confirmation</li>
                  <li>You will receive a confirmation email once payment is verified</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => setPaymentDialogOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const details = `Bank: Trust Link Bank Ghana\nAccount: Trust Link Ventures Limited\nAccount #: 1234567890\nSwift: TLBKGHAC\nReference: ${selectedPaymentQuote.quote_number}\nAmount: ${selectedPaymentQuote.currency} ${selectedPaymentQuote.total_amount?.toLocaleString()}`;
                    navigator.clipboard.writeText(details);
                    toast({
                      title: "Copied!",
                      description: "Payment details copied to clipboard",
                    });
                  }}
                >
                  Copy Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog - Enhanced */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {selectedQuote?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6 pt-4">
              {/* Status & Urgency - Enhanced */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(selectedQuote.status)}>
                    {selectedQuote.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                  <span className="text-sm font-semibold text-muted-foreground">Urgency:</span>
                  <Badge className={getUrgencyColor(selectedQuote.urgency)}>
                    {selectedQuote.urgency}
                  </Badge>
                </div>
              </div>

              {/* Dates - Enhanced */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-primary/5 to-transparent p-4 rounded-lg border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2 font-semibold">Created</div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-semibold">
                      {new Date(selectedQuote.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/5 to-transparent p-4 rounded-lg border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2 font-semibold">Last Updated</div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="h-5 w-5 text-primary" />
                    <span className="font-semibold">
                      {new Date(selectedQuote.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Quote Details - Enhanced with Items */}
              {selectedQuote.final_quote && (
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 rounded-xl p-6 shadow-md">
                  <h4 className="font-bold text-xl mb-4 text-primary flex items-center gap-2">
                    <Package className="h-6 w-6" />
                    Final Quote Details
                  </h4>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Quote Number</div>
                      <div className="font-semibold font-mono bg-primary/10 px-3 py-1 rounded inline-block">{selectedQuote.final_quote.quote_number}</div>
                    </div>
                    {selectedQuote.final_quote.valid_until && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Valid Until</div>
                        <div className="font-semibold">
                          {new Date(selectedQuote.final_quote.valid_until).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                    {selectedQuote.final_quote.sent_at && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Sent Date</div>
                        <div className="font-semibold">
                          {new Date(selectedQuote.final_quote.sent_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quote Items Table in Dialog */}
                  {selectedQuote.final_quote.quote_items && selectedQuote.final_quote.quote_items.length > 0 && (
                    <div className="bg-white dark:bg-background rounded-lg overflow-hidden border border-primary/20">
                      <table className="w-full text-sm">
                        <thead className="bg-primary/10 border-b-2 border-primary/20">
                          <tr>
                            <th className="text-left p-3 font-semibold">Item</th>
                            <th className="text-right p-3 font-semibold">Qty</th>
                            <th className="text-right p-3 font-semibold">Unit Price</th>
                            <th className="text-right p-3 font-semibold">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-muted">
                          {selectedQuote.final_quote.quote_items.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div className="font-medium">{item.product_name}</div>
                                {item.product_description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">{item.product_description}</div>
                                )}
                                {item.specifications && (
                                  <div className="text-xs text-muted-foreground italic mt-0.5">{item.specifications}</div>
                                )}
                              </td>
                              <td className="p-3 text-right font-medium whitespace-nowrap">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {selectedQuote.final_quote.currency} {item.unit_price.toLocaleString()}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {selectedQuote.final_quote.currency} {item.total_price.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-primary/5 border-t-2 border-primary/30">
                          <tr>
                            <td colSpan={3} className="p-3 text-right font-bold">Total Amount:</td>
                            <td className="p-3 text-right">
                              <span className="text-lg font-bold text-primary">
                                {selectedQuote.final_quote.currency} {selectedQuote.final_quote.total_amount?.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              {selectedQuote.message && (
                <div>
                  <h4 className="font-semibold mb-2">Message</h4>
                  <p className="text-muted-foreground bg-muted/30 p-4 rounded-lg">
                    {selectedQuote.message}
                  </p>
                </div>
              )}

              {/* Items */}
              {selectedQuote.quote_request_items && selectedQuote.quote_request_items.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Requested Items ({selectedQuote.quote_request_items.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedQuote.quote_request_items.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-medium">{item.product_name}</h5>
                              {item.specifications && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.specifications}
                                </p>
                              )}
                              {item.preferred_grade && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Preferred Grade: {item.preferred_grade}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {item.quantity} {item.unit}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t">
                {selectedQuote.final_quote?.final_file_url && (
                  <Button 
                    className="flex-1"
                    onClick={() => downloadQuote(selectedQuote.final_quote!.final_file_url!, selectedQuote.final_quote!.quote_number)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Quote PDF
                  </Button>
                )}
                {selectedQuote.status === 'approved' && selectedQuote.final_quote && (
                  <Button className="flex-1 bg-gradient-to-r from-primary to-primary/90">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Place Order
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consolidated Quote Acceptance Dialog */}
      {quoteToAccept && (
        <ConsolidatedQuoteAcceptanceDialog
          open={showAcceptanceDialog}
          onOpenChange={setShowAcceptanceDialog}
          quote={quoteToAccept}
          onSuccess={fetchQuotes}
        />
      )}

      {/* PDF Preview Dialog */}
      {selectedQuoteForPDF && selectedQuoteForPDF.final_quote && (
        <CustomerQuotePDFDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          quote={{
            quote_number: selectedQuoteForPDF.final_quote.quote_number,
            final_file_url: selectedQuoteForPDF.final_quote.final_file_url,
            status: selectedQuoteForPDF.status
          }}
        />
      )}
    </div>
  );
};