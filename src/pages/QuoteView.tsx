import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Mail, CheckCircle, Clock, AlertCircle, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface QuoteViewData {
  id: string;
  quote_number: string;
  title: string;
  description?: string;
  total_amount: number;
  currency: string;
  status: string;
  valid_until?: string;
  created_at: string;
  file_url?: string;
  final_file_url?: string;
  customers?: {
    company_name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
  };
  quote_items: Array<{
    id: string;
    product_name: string;
    product_description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    specifications?: string;
  }>;
}

const QuoteView = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<QuoteViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewStartTime] = useState(Date.now());
  const [approving, setApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    if (token) {
      fetchQuoteByToken(token);
    }
  }, [token]);

  useEffect(() => {
    // Track view duration on unmount
    return () => {
      if (quote && token) {
        const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000);
        trackViewDuration(token, viewDuration);
      }
    };
  }, [quote, token, viewStartTime]);

  const fetchQuoteByToken = async (viewToken: string) => {
    try {
      setLoading(true);
      setError(null);

      // Validate token and get quote_id
      const { data: tokenData, error: tokenError } = await supabase
        .from('quote_view_tokens')
        .select('*, quotes(*)')
        .eq('token', viewToken)
        .single();

      if (tokenError || !tokenData) {
        setError('Invalid or expired link');
        return;
      }

      // Check if token is expired
      const expiresAt = new Date(tokenData.expires_at);
      if (expiresAt < new Date()) {
        setError('This link has expired');
        return;
      }

      // Fetch quote with items
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select(`
          *,
          customers (
            company_name,
            contact_name,
            email,
            phone
          ),
          quote_items (*)
        `)
        .eq('id', tokenData.quote_id)
        .single();

      if (quoteError || !quoteData) {
        setError('Quote not found');
        return;
      }

      setQuote(quoteData as QuoteViewData);

      // Update access count and last accessed time
      await supabase
        .from('quote_view_tokens')
        .update({
          access_count: (tokenData.access_count || 0) + 1,
          last_accessed_at: new Date().toISOString()
        })
        .eq('token', viewToken);

      // Log view analytics
      await supabase.from('quote_view_analytics').insert({
        quote_id: tokenData.quote_id,
        token: viewToken,
        viewed_at: new Date().toISOString(),
        user_agent: navigator.userAgent
      });

      // Log audit event
      await supabase.from('audit_logs').insert({
        event_type: 'quote_viewed',
        action: 'view',
        resource_type: 'quote',
        resource_id: tokenData.quote_id,
        event_data: {
          quote_number: quoteData.quote_number,
          view_token: viewToken,
          customer_email: tokenData.customer_email
        },
        severity: 'low'
      });

      // Broadcast real-time notification to admin channel
      const channel = supabase.channel('quote-views');
      channel.send({
        type: 'broadcast',
        event: 'quote_viewed',
        payload: {
          quoteId: tokenData.quote_id,
          quoteNumber: quoteData.quote_number,
          customerEmail: tokenData.customer_email,
          viewedAt: new Date().toISOString()
        }
      });

    } catch (err: any) {
      console.error('Error fetching quote:', err);
      setError('Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const trackViewDuration = async (viewToken: string, duration: number) => {
    try {
      await supabase
        .from('quote_view_analytics')
        .update({ view_duration: duration })
        .eq('token', viewToken)
        .order('viewed_at', { ascending: false })
        .limit(1);
    } catch (err) {
      console.error('Error tracking view duration:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!quote?.final_file_url && !quote?.file_url) {
      toast.error('PDF not available');
      return;
    }

    const pdfUrl = quote.final_file_url || quote.file_url;
    window.open(pdfUrl, '_blank');
    toast.success('Opening PDF...');
  };

  const handleRequestChanges = () => {
    const subject = `Quote Changes Request - ${quote?.quote_number}`;
    const body = `I would like to request changes to Quote ${quote?.quote_number}.\n\nPlease describe the changes you need:\n\n`;
    const mailtoLink = `mailto:${quote?.customers?.email || 'sales@trustlinkcompany.com'}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleApprove = async () => {
    if (!quote || !token) return;

    setApproving(true);
    try {
      const { error } = await supabase.functions.invoke('quote-approval', {
        body: {
          token,
          action: 'approve',
          quoteId: quote.id,
          customerEmail: quote.customers?.email
        }
      });

      if (error) throw error;

      toast.success('Quote approved successfully!');
      
      // Update local state
      setQuote({ ...quote, status: 'approved' });
    } catch (err: any) {
      console.error('Error approving quote:', err);
      toast.error('Failed to approve quote. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!quote || !token) return;

    setApproving(true);
    try {
      const { error } = await supabase.functions.invoke('quote-approval', {
        body: {
          token,
          action: 'reject',
          quoteId: quote.id,
          customerEmail: quote.customers?.email
        }
      });

      if (error) throw error;

      toast.success('Quote rejected successfully.');
      
      // Update local state
      setQuote({ ...quote, status: 'rejected' });
    } catch (err: any) {
      console.error('Error rejecting quote:', err);
      toast.error('Failed to reject quote. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Unable to Load Quote</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">{quote.title}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Quote #{quote.quote_number}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={isExpired ? 'destructive' : 'default'}>
                  {isExpired ? (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Expired
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Valid until {format(new Date(quote.valid_until!), 'MMM dd, yyyy')}
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Company Information</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p className="font-medium text-foreground">{quote.customers?.company_name}</p>
                  {quote.customers?.contact_name && <p>{quote.customers.contact_name}</p>}
                  {quote.customers?.email && <p>{quote.customers.email}</p>}
                  {quote.customers?.phone && <p>{quote.customers.phone}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quote Details</h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  <p>Created: {format(new Date(quote.created_at), 'MMM dd, yyyy')}</p>
                  <p>Currency: {quote.currency}</p>
                  <p className="text-lg font-bold text-foreground mt-2">
                    Total: {quote.currency} {quote.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            {quote.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.quote_items.map((item, index) => (
                <div key={item.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.product_name}</h4>
                        {item.product_description && (
                          <p className="text-sm text-muted-foreground">{item.product_description}</p>
                        )}
                        {item.specifications && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            Specs: {item.specifications}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {quote.currency} {item.total_price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Quantity: {item.quantity} {item.unit}</span>
                      <span>Unit Price: {quote.currency} {item.unit_price.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Approve/Reject Actions */}
              {quote.status !== 'approved' && quote.status !== 'rejected' && !isExpired && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => setShowApproveDialog(true)} 
                    className="flex-1"
                    disabled={approving}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {approving ? 'Processing...' : 'Approve Quote'}
                  </Button>
                  <Button 
                    onClick={() => setShowRejectDialog(true)} 
                    variant="destructive" 
                    className="flex-1"
                    disabled={approving}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    Reject Quote
                  </Button>
                </div>
              )}

              {/* Status Message */}
              {quote.status === 'approved' && (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Quote Approved</span>
                </div>
              )}

              {quote.status === 'rejected' && (
                <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Quote Rejected</span>
                </div>
              )}

              {/* Other Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {(quote.final_file_url || quote.file_url) && (
                  <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button onClick={handleRequestChanges} variant="outline" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              This quote is valid until {quote.valid_until ? format(new Date(quote.valid_until), 'MMMM dd, yyyy') : 'specified date'}.
              <br />
              For questions, please contact {quote.customers?.email || 'sales@trustlinkcompany.com'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Approve Quote"
        description="Are you sure you want to approve this quote? This action will notify the sales team."
        onConfirm={handleApprove}
        confirmText="Approve"
        variant="default"
      />

      <ConfirmationDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Reject Quote"
        description="Are you sure you want to reject this quote? You can still contact the sales team to discuss alternatives."
        onConfirm={handleReject}
        confirmText="Reject"
        variant="destructive"
      />
    </div>
  );
};

export default QuoteView;