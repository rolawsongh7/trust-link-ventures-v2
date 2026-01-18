import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ensureSignedUrl } from '@/lib/storageHelpers';
import { CustomerQuotePDFDialog } from './CustomerQuotePDFDialog';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ConsolidatedQuoteAcceptanceDialog } from './ConsolidatedQuoteAcceptanceDialog';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileQuoteCard } from './mobile/MobileQuoteCard';
import { QuoteHeader } from './quotes/QuoteHeader';
import { QuoteFilters } from './quotes/QuoteFilters';
import { QuoteTableView } from './quotes/QuoteTableView';
import { QuoteCardView } from './quotes/QuoteCardView';
import { QuoteSkeletonLoader } from './quotes/QuoteSkeletonLoader';
import { EmptyQuotesState } from './quotes/EmptyQuotesState';

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
  const navigate = useNavigate();
  const { quoteId } = useParams<{ quoteId?: string }>();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [showAcceptanceDialog, setShowAcceptanceDialog] = useState(false);
  const [quoteToAccept, setQuoteToAccept] = useState<any>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedQuoteForPDF, setSelectedQuoteForPDF] = useState<Quote | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { isMobile: isMobileDetection } = useMobileDetection();

  // Auto-open quote PDF when navigating with quoteId in URL
  useEffect(() => {
    if (quoteId && quotes.length > 0 && !loading && !hasAutoOpened) {
      const matchingQuote = quotes.find(q => q.id === quoteId || q.final_quote?.id === quoteId);
      if (matchingQuote && matchingQuote.final_quote?.final_file_url) {
        setSelectedQuoteForPDF(matchingQuote);
        setPdfDialogOpen(true);
        setHasAutoOpened(true);
      } else if (matchingQuote && !matchingQuote.final_quote?.final_file_url) {
        toast({
          title: "Quote pending",
          description: "This quote request is still being processed.",
        });
        setHasAutoOpened(true);
      } else if (!matchingQuote) {
        toast({
          variant: "destructive",
          title: "Quote not found",
          description: "The requested quote could not be found.",
        });
        setHasAutoOpened(true);
      }
    }
  }, [quoteId, quotes, loading, hasAutoOpened, toast]);

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
        .ilike('lead_email', profile.email)
        .order('created_at', { ascending: false });

      if (requestsError) {
        console.error('❌ Error fetching quote requests:', requestsError);
        throw requestsError;
      }

      console.log('✅ Quote requests found:', quoteRequests?.length || 0);

      // Fetch linked final quotes with items
      let finalQuotes = [];
      
      if (quoteRequests && quoteRequests.length > 0) {
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
            ),
            orders_by_quote_id:orders!quote_id(id, order_number, status),
            orders_by_source:orders!source_quote_id(id, order_number, status)
          `)
          .or(`customer_email.eq.${profile.email},linked_quote_request_id.in.(${quoteRequests.map(q => q.id).join(',')})`);

        if (quotesError) throw quotesError;
        
        // Process quotes to add linked_order field
        finalQuotes = (data || []).map(quote => {
          const allOrders = [
            ...(quote.orders_by_quote_id || []),
            ...(quote.orders_by_source || [])
          ].filter((order, index, self) => 
            index === self.findIndex(o => o.id === order.id)
          );
          return {
            ...quote,
            linked_order: allOrders.length > 0 ? allOrders[0] : null
          };
        });
      } else {
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
            ),
            orders_by_quote_id:orders!quote_id(id, order_number, status),
            orders_by_source:orders!source_quote_id(id, order_number, status)
          `)
          .eq('customer_email', profile.email);

        if (quotesError) throw quotesError;
        
        // Process quotes to add linked_order field
        finalQuotes = (data || []).map(quote => {
          const allOrders = [
            ...(quote.orders_by_quote_id || []),
            ...(quote.orders_by_source || [])
          ].filter((order, index, self) => 
            index === self.findIndex(o => o.id === order.id)
          );
          return {
            ...quote,
            linked_order: allOrders.length > 0 ? allOrders[0] : null
          };
        });
      }

      // Merge quote requests with their final quotes
      const mergedData = quoteRequests?.map(request => {
        const linkedQuotes = finalQuotes?.filter(q => q.linked_quote_request_id === request.id) || [];
        
        let finalQuote;
        
        if (linkedQuotes.length > 0) {
          const actionableQuotes = linkedQuotes.filter(q => 
            ['sent', 'accepted', 'rejected'].includes(q.status)
          );
          
          if (actionableQuotes.length > 0) {
            finalQuote = actionableQuotes.sort((a, b) => 
              new Date(b.sent_at || b.created_at).getTime() - 
              new Date(a.sent_at || a.created_at).getTime()
            )[0];
          } else {
            finalQuote = linkedQuotes.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];
          }
        }
        
        if (!finalQuote) {
          const usedQuoteIds = quoteRequests
            .map(r => {
              const linked = finalQuotes?.filter(q => q.linked_quote_request_id === r.id) || [];
              return linked.length > 0 ? linked[0].id : null;
            })
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
          linked_order: finalQuote?.linked_order || null,
          status: finalQuote ? 
            (finalQuote.status === 'sent' ? 'quoted' : 
             finalQuote.status === 'accepted' ? 'approved' : 
             finalQuote.status === 'rejected' ? 'rejected' :
             finalQuote.status === 'converted' ? 'converted' :
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

  const handleApproveQuote = (finalQuote: any) => {
    console.log('handleApproveQuote called with:', finalQuote);
    
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

      fetchQuotes();
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject quote. Please try again.",
      });
    }
  };

  const downloadQuote = async (fileUrl: string, quoteNumber: string = 'quote') => {
    try {
      console.log('Attempting to download quote PDF:', fileUrl);
      
      const secureUrl = await ensureSignedUrl(fileUrl);
      const response = await fetch(secureUrl);
      
      if (!response.ok) {
        throw new Error(`File not found: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${quoteNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
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
        description: error instanceof Error ? error.message : "Unable to download the quote.",
      });
    }
  };

  const handleViewQuote = (quote: Quote) => {
    const sentStatuses = ['sent', 'accepted', 'converted', 'rejected'];
    const isQuoteSent = quote.final_quote && sentStatuses.includes(quote.final_quote.status);
    
    if (isQuoteSent && quote.final_quote?.final_file_url) {
      setSelectedQuoteForPDF(quote);
      setPdfDialogOpen(true);
    } else if (quote.final_quote && !isQuoteSent) {
      // Quote exists but hasn't been sent yet
      toast({
        title: "Quote in progress",
        description: "Your quote is still being prepared. Please check back soon.",
      });
    } else {
      // No quote created yet
      toast({
        title: "Processing your request",
        description: "Our team is working on your quote. We'll notify you when it's ready.",
      });
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  // Calculate stats
  const stats = {
    total: filteredQuotes.length,
    pending: filteredQuotes.filter(q => q.status === 'pending').length,
    quoted: filteredQuotes.filter(q => q.status === 'quoted').length,
    approved: filteredQuotes.filter(q => q.status === 'approved').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--tl-bg))] to-white dark:from-slate-950 dark:to-slate-900 pt-safe pb-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Header */}
        <QuoteHeader
          totalQuotes={stats.total}
          pendingCount={stats.pending}
          quotedCount={stats.quoted}
          approvedCount={stats.approved}
        />
        
        {/* Filters */}
        <QuoteFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onClearFilters={handleClearFilters}
        />
        
        {/* Content */}
        {loading ? (
          <QuoteSkeletonLoader viewMode={viewMode} />
        ) : filteredQuotes.length === 0 ? (
          <EmptyQuotesState />
        ) : viewMode === 'table' && !isMobile ? (
          <QuoteTableView
            quotes={filteredQuotes}
            onView={handleViewQuote}
            onDownload={(url) => downloadQuote(url, 'quote')}
            onApprove={handleApproveQuote}
            onReject={handleRejectQuote}
          />
        ) : (
          <QuoteCardView
            quotes={filteredQuotes}
            onView={handleViewQuote}
            onDownload={(url) => downloadQuote(url, 'quote')}
            onApprove={handleApproveQuote}
            onReject={handleRejectQuote}
          />
        )}
        
        {/* Dialogs */}
        <CustomerQuotePDFDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          quote={selectedQuoteForPDF?.final_quote || null}
        />
        
        <ConsolidatedQuoteAcceptanceDialog
          open={showAcceptanceDialog}
          onOpenChange={setShowAcceptanceDialog}
          quote={quoteToAccept}
          onSuccess={() => {
            setShowAcceptanceDialog(false);
            fetchQuotes();
          }}
        />
      </div>
      
      {/* Mobile Floating Action Button */}
      {isMobileDetection && (
        <button
          className="fixed bottom-20 right-6 p-4 rounded-full bg-gradient-to-r from-trustlink-maritime to-trustlink-navy text-white shadow-lg hover:shadow-xl transition-all active:scale-95 z-50"
          onClick={() => navigate('/portal/quote-request')}
          aria-label="Request new quote"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};
