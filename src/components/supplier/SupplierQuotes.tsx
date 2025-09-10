import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Send, 
  Eye,
  Calendar,
  Building,
  User
} from 'lucide-react';

interface QuoteRequest {
  id: string;
  title: string;
  message: string;
  urgency: string;
  status: string;
  expected_delivery_date: string;
  created_at: string;
  lead_company_name: string;
  lead_contact_name: string;
  lead_email: string;
  lead_country: string;
  quote_request_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    specifications: string;
  }>;
}

const SupplierQuotes = () => {
  const { toast } = useToast();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQuoteRequests();
  }, []);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          quote_request_items (
            id,
            product_name,
            quantity,
            unit,
            specifications
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuoteRequests(data || []);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      toast({
        title: "Error",
        description: "Failed to load quote requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const filteredRequests = quoteRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status.toLowerCase() === filter;
  });

  const statusCounts = {
    all: quoteRequests.length,
    pending: quoteRequests.filter(q => q.status.toLowerCase() === 'pending').length,
    sent: quoteRequests.filter(q => q.status.toLowerCase() === 'sent').length,
    approved: quoteRequests.filter(q => q.status.toLowerCase() === 'approved').length,
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quote Requests</h1>
        <p className="text-muted-foreground">Respond to customer quote requests</p>
      </div>

      {/* Status Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className="flex items-center space-x-2"
              >
                <span className="capitalize">{status}</span>
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quote Requests */}
      <div className="space-y-6">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-xl">{request.title}</CardTitle>
                    <Badge variant={getUrgencyColor(request.urgency)}>
                      {request.urgency} Priority
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(request.status)}
                      <span className="capitalize">{request.status}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <Button className="w-full lg:w-auto">
                  {request.status.toLowerCase() === 'pending' ? 'Create Quote' : 'View Quote'}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.lead_company_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{request.lead_contact_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Email: {request.lead_email}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Country: {request.lead_country}
                  </div>
                  {request.expected_delivery_date && (
                    <div className="text-sm text-muted-foreground">
                      Expected: {new Date(request.expected_delivery_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Message */}
              {request.message && (
                <div className="space-y-2">
                  <h4 className="font-medium">Message:</h4>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                    {request.message}
                  </p>
                </div>
              )}

              {/* Requested Items */}
              <div className="space-y-3">
                <h4 className="font-medium">Requested Items:</h4>
                <div className="grid gap-3">
                  {request.quote_request_items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h5 className="font-medium">{item.product_name}</h5>
                          {item.specifications && (
                            <p className="text-sm text-muted-foreground">
                              Specs: {item.specifications}
                            </p>
                          )}
                        </div>
                        <div className="text-sm font-medium">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <div className="flex items-center space-x-2">
                  {request.status.toLowerCase() === 'pending' && (
                    <>
                      <Button variant="outline" size="sm">
                        Decline
                      </Button>
                      <Button size="sm">
                        Create Quote
                      </Button>
                    </>
                  )}
                  {request.status.toLowerCase() === 'sent' && (
                    <Button variant="outline" size="sm">
                      Edit Quote
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quote requests found</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'You have no quote requests yet'
                : `No quote requests with status: ${filter}`
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierQuotes;