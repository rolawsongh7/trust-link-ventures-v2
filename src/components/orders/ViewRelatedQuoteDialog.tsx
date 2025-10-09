import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package } from 'lucide-react';

interface ViewRelatedQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | null;
}

interface QuoteDetails {
  id: string;
  quote_number: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  status: string;
  valid_until: string;
  created_at: string;
  quote_items: Array<{
    product_name: string;
    product_description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>;
}

export const ViewRelatedQuoteDialog: React.FC<ViewRelatedQuoteDialogProps> = ({
  open,
  onOpenChange,
  quoteId,
}) => {
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
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
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items(*)
        `)
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      setQuote(data as QuoteDetails);
    } catch (error) {
      console.error('Error fetching quote details:', error);
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Related Quote Details</DialogTitle>
          <DialogDescription>
            View the quote that was converted to this order
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : quote ? (
          <div className="space-y-4">
            {/* Quote Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quote.quote_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{quote.title}</p>
                  </div>
                  <Badge className={getStatusColor(quote.status)}>
                    {quote.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Total Amount</p>
                    <p className="text-muted-foreground">
                      {quote.total_amount.toLocaleString()} {quote.currency}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Valid Until</p>
                    <p className="text-muted-foreground">
                      {new Date(quote.valid_until).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Description</p>
                    <p className="text-muted-foreground">
                      {quote.description || 'No description'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quote Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Quote Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.quote_items.map((item, index) => (
                    <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          {item.product_description && (
                            <p className="text-sm text-muted-foreground">
                              {item.product_description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.quantity} {item.unit} @ {item.unit_price.toLocaleString()} {quote.currency}/{item.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {item.total_price.toLocaleString()} {quote.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg">
                    {quote.total_amount.toLocaleString()} {quote.currency}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No quote details available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
