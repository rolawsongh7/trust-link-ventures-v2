import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Link2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OrphanedQuote {
  id: string;
  quote_number: string;
  customer_email: string;
  total_amount: number;
  created_at: string;
  quote_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

interface QuoteRequest {
  id: string;
  quote_number: string;
  title: string;
  lead_email: string;
  created_at: string;
  quote_request_items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

export const LinkOrphanedQuotes: React.FC = () => {
  const [orphanedQuotes, setOrphanedQuotes] = useState<OrphanedQuote[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch quotes without linked_quote_request_id
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          customer_email,
          total_amount,
          created_at,
          quote_items (product_name, quantity)
        `)
        .is('linked_quote_request_id', null)
        .not('customer_email', 'is', null)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // Fetch all quote requests
      const { data: requests, error: requestsError } = await supabase
        .from('quote_requests')
        .select(`
          id,
          quote_number,
          title,
          lead_email,
          created_at,
          quote_request_items (product_name, quantity)
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      setOrphanedQuotes(quotes || []);
      setQuoteRequests(requests || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orphaned quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const linkQuoteToRequest = async (quoteId: string, requestId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ linked_quote_request_id: requestId })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Quote linked to request successfully',
      });

      // Refresh data
      fetchData();
      // Remove from selected links
      const newLinks = { ...selectedLinks };
      delete newLinks[quoteId];
      setSelectedLinks(newLinks);
    } catch (error) {
      console.error('Error linking quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to link quote',
        variant: 'destructive',
      });
    }
  };

  const suggestMatch = (quote: OrphanedQuote): QuoteRequest | null => {
    // Find requests with matching email and similar products
    const matchingRequests = quoteRequests.filter(req => 
      req.lead_email === quote.customer_email
    );

    if (matchingRequests.length === 0) return null;

    // If only one match, suggest it
    if (matchingRequests.length === 1) return matchingRequests[0];

    // Try to find best match by comparing products
    const quoteProducts = new Set(quote.quote_items?.map(i => i.product_name.toLowerCase()) || []);
    
    let bestMatch = matchingRequests[0];
    let maxOverlap = 0;

    matchingRequests.forEach(req => {
      const reqProducts = new Set(req.quote_request_items?.map(i => i.product_name.toLowerCase()) || []);
      const overlap = [...quoteProducts].filter(p => reqProducts.has(p)).length;
      
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestMatch = req;
      }
    });

    return bestMatch;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (orphanedQuotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            All Quotes Linked
          </CardTitle>
          <CardDescription>
            All quotes are properly linked to their quote requests
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Orphaned Quotes ({orphanedQuotes.length})
        </CardTitle>
        <CardDescription>
          These quotes are not linked to any quote request. Link them to fix duplicate display issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Quotes without a linked request may appear multiple times in the customer portal.
            Link each quote to its corresponding request to fix this.
          </AlertDescription>
        </Alert>

        {orphanedQuotes.map(quote => {
          const suggestedMatch = suggestMatch(quote);
          const matchingRequests = quoteRequests.filter(req => 
            req.lead_email === quote.customer_email
          );

          return (
            <Card key={quote.id} className="border-orange-200">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Quote: {quote.quote_number}</h4>
                    <p className="text-sm text-muted-foreground">{quote.customer_email}</p>
                    <p className="text-sm text-muted-foreground">
                      ${quote.total_amount?.toLocaleString()}
                    </p>
                    <div className="text-sm text-muted-foreground mt-2">
                      Items: {quote.quote_items?.map(i => i.product_name).join(', ')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link to Quote Request:</label>
                    <Select
                      value={selectedLinks[quote.id] || ''}
                      onValueChange={(value) => 
                        setSelectedLinks({ ...selectedLinks, [quote.id]: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select request..." />
                      </SelectTrigger>
                      <SelectContent>
                        {matchingRequests.map(req => (
                          <SelectItem 
                            key={req.id} 
                            value={req.id}
                            className={req.id === suggestedMatch?.id ? 'bg-green-50 font-semibold' : ''}
                          >
                            {req.quote_number} - {req.title}
                            {req.id === suggestedMatch?.id && ' (Suggested)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      className="w-full"
                      disabled={!selectedLinks[quote.id]}
                      onClick={() => linkQuoteToRequest(quote.id, selectedLinks[quote.id])}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link Quote to Request
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};