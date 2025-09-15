import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Award, Clock, DollarSign, Calendar, CheckCircle, Eye } from 'lucide-react';

interface QuoteSubmission {
  id: string;
  supplier_email: string;
  supplier_name: string;
  supplier_company: string;
  supplier_phone?: string;
  quote_amount: number;
  currency: string;
  delivery_date?: string;
  validity_days: number;
  notes?: string;
  file_url?: string;
  submitted_at: string;
  status: string;
}

interface QuoteComparisonProps {
  rfqId: string;
  rfqTitle: string;
}

const QuoteComparison: React.FC<QuoteComparisonProps> = ({ rfqId, rfqTitle }) => {
  const [quotes, setQuotes] = useState<QuoteSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, [rfqId]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_submissions')
        .select('*')
        .eq('rfq_id', rfqId)
        .order('quote_amount', { ascending: true });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quote submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectWinningQuote = async (quoteId: string) => {
    try {
      // Update all quotes to 'reviewed' status
      await supabase
        .from('quote_submissions')
        .update({ 
          status: 'reviewed',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('rfq_id', rfqId);

      // Mark the selected quote as 'selected'
      const { error } = await supabase
        .from('quote_submissions')
        .update({ status: 'selected' })
        .eq('id', quoteId);

      if (error) throw error;

      setSelectedQuote(quoteId);
      await fetchQuotes();
      
      toast({
        title: "Success",
        description: "Winning quote selected successfully",
      });
    } catch (error: any) {
      console.error('Error selecting quote:', error);
      toast({
        title: "Error",
        description: "Failed to select winning quote",
        variant: "destructive",
      });
    }
  };

  const downloadQuoteFile = async (fileUrl: string, supplierName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('quotes')
        .download(fileUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${supplierName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download quote file",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string, isLowest: boolean) => {
    switch (status) {
      case 'selected':
        return <Badge className="bg-green-500 text-white"><Award className="mr-1 h-3 w-3" />Selected</Badge>;
      case 'reviewed':
        return <Badge variant="secondary"><CheckCircle className="mr-1 h-3 w-3" />Reviewed</Badge>;
      default:
        return (
          <div className="flex gap-2">
            <Badge variant="outline">Submitted</Badge>
            {isLowest && <Badge className="bg-blue-500 text-white"><DollarSign className="mr-1 h-3 w-3" />Lowest</Badge>}
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No quotes received yet for this RFQ.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lowestAmount = Math.min(...quotes.map(q => q.quote_amount));
  const hasSelectedQuote = quotes.some(q => q.status === 'selected');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Quote Comparison - {rfqTitle}</span>
          <Badge variant="outline">{quotes.length} Quote{quotes.length !== 1 ? 's' : ''} Received</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => {
                const isLowest = quote.quote_amount === lowestAmount && quotes.length > 1;
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + quote.validity_days);

                return (
                  <TableRow key={quote.id} className={quote.status === 'selected' ? 'bg-green-50' : ''}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{quote.supplier_company}</div>
                        <div className="text-sm text-muted-foreground">{quote.supplier_name}</div>
                        <div className="text-sm text-muted-foreground">{quote.supplier_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${isLowest ? 'text-blue-600 font-bold' : ''}`}>
                        {formatCurrency(quote.quote_amount, quote.currency)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {quote.delivery_date ? (
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {new Date(quote.delivery_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="mr-1 h-4 w-4" />
                        {validUntil.toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quote.status, isLowest)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Quote Details - {quote.supplier_company}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Contact Person</label>
                                  <p className="text-sm text-muted-foreground">{quote.supplier_name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Phone</label>
                                  <p className="text-sm text-muted-foreground">{quote.supplier_phone || 'Not provided'}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Quote Amount</label>
                                  <p className="text-sm font-medium">{formatCurrency(quote.quote_amount, quote.currency)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Submitted</label>
                                  <p className="text-sm text-muted-foreground">{new Date(quote.submitted_at).toLocaleString()}</p>
                                </div>
                              </div>
                              {quote.notes && (
                                <div>
                                  <label className="text-sm font-medium">Notes</label>
                                  <p className="text-sm text-muted-foreground mt-1">{quote.notes}</p>
                                </div>
                              )}
                              {quote.file_url && (
                                <div>
                                  <Button 
                                    onClick={() => downloadQuoteFile(quote.file_url!, quote.supplier_name)}
                                    variant="outline"
                                  >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Download Quote Document
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {!hasSelectedQuote && quote.status !== 'selected' && (
                          <Button 
                            size="sm" 
                            onClick={() => selectWinningQuote(quote.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Award className="mr-1 h-4 w-4" />
                            Select
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteComparison;