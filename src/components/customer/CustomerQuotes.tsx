import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Search, Download, Eye, Calendar, DollarSign, Clock, Package } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


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
  };
}

export const CustomerQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { profile } = useCustomerAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, [profile]);

  const fetchQuotes = async () => {
    if (!profile?.email) return;

    try {
      // Fetch quote requests
      const { data: quoteRequests, error: requestsError } = await supabase
        .from('quote_requests')
        .select(`
          *,
          quote_request_items (*)
        `)
        .eq('lead_email', profile.email)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch linked final quotes
      const { data: finalQuotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, quote_number, status, total_amount, currency, valid_until, final_file_url, sent_at, linked_quote_request_id, customer_email')
        .or(`customer_email.eq.${profile.email},linked_quote_request_id.in.(${quoteRequests?.map(q => q.id).join(',') || 'null'})`);

      if (quotesError) throw quotesError;

      // Merge quote requests with their final quotes
      const mergedData = quoteRequests?.map(request => {
        const finalQuote = finalQuotes?.find(q => 
          q.linked_quote_request_id === request.id ||
          (q.customer_email && q.customer_email === request.lead_email)
        );
        
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

  const handleApproveQuote = async (quoteId: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Quote Approved",
        description: "Thank you! Please see payment instructions below.",
      });

      fetchQuotes(); // Refresh the list
    } catch (error) {
      console.error('Error approving quote:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve quote. Please try again.",
      });
    }
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
      
      // Fetch the file as a blob
      const response = await fetch(fileUrl);
      
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

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{quote.title}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(quote.created_at).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Updated {new Date(quote.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getUrgencyColor(quote.urgency)}>
                      {quote.urgency}
                    </Badge>
                    <Badge className={getStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {quote.message && (
                  <p className="text-muted-foreground mb-4">{quote.message}</p>
                )}
                
                {/* Final Quote Info */}
                {quote.final_quote && (
                  <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-primary">Final Quote Available</h4>
                      <Badge variant="outline" className="bg-primary/10">
                        {quote.final_quote.quote_number}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="ml-2 font-semibold">
                          {quote.final_quote.currency} {quote.final_quote.total_amount?.toLocaleString()}
                        </span>
                      </div>
                      {quote.final_quote.valid_until && (
                        <div>
                          <span className="text-muted-foreground">Valid Until:</span>
                          <span className="ml-2">
                            {new Date(quote.final_quote.valid_until).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {quote.final_quote.status === 'sent' && (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApproveQuote(quote.final_quote!.id)}
                        >
                          ✓ Approve Quote
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleRejectQuote(quote.final_quote!.id)}
                        >
                          ✗ Reject Quote
                        </Button>
                      </div>
                    )}
                    {quote.final_quote.status === 'accepted' && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-green-800 font-semibold text-sm">✓ Quote Approved</p>
                        <p className="text-sm text-muted-foreground mt-1">See payment instructions below</p>
                      </div>
                    )}
                  </div>
                )}

                {quote.quote_request_items && quote.quote_request_items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Items Requested:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {quote.quote_request_items.slice(0, 4).map((item, index) => (
                        <div key={index} className="text-sm bg-muted/50 p-2 rounded">
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-muted-foreground ml-2">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                      {quote.quote_request_items.length > 4 && (
                        <div className="text-sm text-muted-foreground">
                          +{quote.quote_request_items.length - 4} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedQuote(quote);
                      setDetailsDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {quote.final_quote?.final_file_url && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => downloadQuote(quote.final_quote!.final_file_url!, quote.final_quote!.quote_number)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Quote
                    </Button>
                  )}
                  
                  {(quote.status === 'approved' || quote.final_quote?.status === 'accepted') && quote.final_quote && (
                    <div className="w-full mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-blue-800">
                          <strong>Payment Method:</strong> Mobile Money (MTN/Vodafone/AirtelTigo)
                        </p>
                        <div className="bg-white p-3 rounded border border-blue-200">
                          <p className="font-semibold text-blue-900 mb-1">Trust Link Ventures</p>
                          <p className="text-blue-800">
                            <strong>Phone:</strong> +233 123 456 789
                          </p>
                          <p className="text-blue-800">
                            <strong>Email:</strong> info@trustlinkventures.com
                          </p>
                          <p className="text-blue-800 mt-2">
                            <strong>Amount to Pay:</strong> {quote.final_quote.currency} {quote.final_quote.total_amount?.toLocaleString()}
                          </p>
                          <p className="text-blue-800">
                            <strong>Reference:</strong> {quote.final_quote.quote_number}
                          </p>
                        </div>
                        <p className="text-blue-700 text-xs mt-2">
                          Please send payment confirmation to info@trustlinkventures.com with the reference number.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedQuote?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-6">
              {/* Status & Urgency */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(selectedQuote.status)}>
                    {selectedQuote.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Urgency:</span>
                  <Badge className={getUrgencyColor(selectedQuote.urgency)}>
                    {selectedQuote.urgency}
                  </Badge>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Created</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedQuote.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Last Updated</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedQuote.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Final Quote Details */}
              {selectedQuote.final_quote && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold mb-3 text-primary">Final Quote Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Quote Number</div>
                      <div className="font-semibold">{selectedQuote.final_quote.quote_number}</div>
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
    </div>
  );
};