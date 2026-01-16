import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Package, History } from 'lucide-react';
import QuoteAuditTrail from './QuoteAuditTrail';

interface QuoteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | null;
}

export const QuoteDetailsDialog: React.FC<QuoteDetailsDialogProps> = ({
  open,
  onOpenChange,
  quoteId
}) => {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && quoteId) {
      fetchQuoteDetails();
    }
  }, [open, quoteId]);

  const fetchQuoteDetails = async () => {
    if (!quoteId) return;
    
    setLoading(true);
    try {
      console.log(`[QuoteDetails] Loading quote ${quoteId}...`);
      
      const { data, error } = await supabase
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
        .eq('id', quoteId)
        .single();

      if (error) {
        console.error('[QuoteDetails] Failed to fetch quote:', error);
        throw error;
      }
      
      console.log(`[QuoteDetails] Quote loaded with ${data?.quote_items?.length || 0} items`);
      setQuote(data);
    } catch (error: any) {
      console.error('[QuoteDetails] Error fetching quote details:', error);
      // Set quote to empty object so we can still render the dialog with an error
      setQuote({ 
        quote_number: 'Error', 
        status: 'error',
        quote_items: [],
        _error: error.message || 'Failed to load quote details'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!quote) return null;

  const hasError = quote._error;
  const hasNoItems = !quote.quote_items || quote.quote_items.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Quote Details - {quote.quote_number}</DialogTitle>
            <Badge className={getStatusColor(quote.status)}>
              {quote.status}
            </Badge>
          </div>
        </DialogHeader>

        {hasError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-destructive font-medium">Error loading quote</p>
            <p className="text-sm text-muted-foreground">{quote._error}</p>
          </div>
        )}

        {hasNoItems && !hasError && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">No items found</p>
            <p className="text-sm text-muted-foreground">This quote has no line items. Use the Editor to add or recover items.</p>
          </div>
        )}

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items ({quote.quote_items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{quote.customers?.company_name}</p>
                      <p className="text-sm text-muted-foreground">{quote.customers?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium">{quote.customers?.contact_name || 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">{quote.customers?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium text-lg">{quote.currency} {quote.total_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valid Until</p>
                      <p className="font-medium">{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Origin Type</p>
                      <Badge variant="outline">{quote.origin_type || 'manual'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {quote.description && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="mt-1">{quote.description}</p>
                    </div>
                  )}

                  {quote.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="mt-1 text-sm">{quote.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="items" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {quote.quote_items?.map((item: any, index: number) => (
                <Card key={item.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        {item.product_description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.product_description}</p>
                        )}
                        {item.specifications && (
                          <p className="text-xs text-muted-foreground mt-1">Specs: {item.specifications}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {item.unit} × {quote.currency} {item.unit_price?.toFixed(2)}
                        </p>
                        <p className="font-medium">{quote.currency} {item.total_price?.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span>{quote.currency} {quote.total_amount?.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="flex-1 overflow-y-auto mt-4">
            {quoteId && <QuoteAuditTrail quoteId={quoteId} quoteNumber={quote.quote_number} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
