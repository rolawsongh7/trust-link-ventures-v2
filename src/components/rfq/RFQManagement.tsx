import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Send, Eye, CheckCircle, XCircle, Clock, Mail, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuoteComparison from './QuoteComparison';

interface RFQ {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  status: string;
  created_at: string;
  quotes: {
    id: string;
    quote_number: string;
    total_amount: number;
    currency: string;
    customers?: {
      company_name: string;
    };
  };
  rfq_responses: {
    id: string;
    supplier_id: string;
    response_data: any;
    notes?: string;
    status: string;
    submitted_at: string;
    suppliers: {
      name: string;
    };
  }[];
}

interface RFQResponse {
  supplier_id: string;
  response_data: {
    items: Array<{
      product_name: string;
      quantity: number;
      unit_price: number;
      unit: string;
      specifications?: string;
    }>;
    total_amount: number;
    currency: string;
    delivery_terms?: string;
    payment_terms?: string;
    validity_period?: string;
  };
  notes: string;
}

const RFQManagement = () => {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [supplierEmails, setSupplierEmails] = useState<string>('');
  const [sendingMagicLinks, setSendingMagicLinks] = useState(false);
  const [activeTab, setActiveTab] = useState('rfqs');
  const { toast } = useToast();

  useEffect(() => {
    fetchRFQs();
    fetchSuppliers();
  }, []);

  const fetchRFQs = async () => {
    try {
      const { data, error } = await supabase
        .from('rfqs')
        .select(`
          *,
          quotes(
            id, quote_number, total_amount, currency,
            customers(company_name)
          ),
          rfq_responses(
            id, supplier_id, response_data, notes, status, submitted_at,
            suppliers(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRfqs(data || []);
    } catch (error) {
      console.error('Error fetching RFQs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch RFQs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, contact_person, email')
        .eq('is_active', true);

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const sendMagicLinks = async (rfq: RFQ) => {
    try {
      setSendingMagicLinks(true);
      
      // Parse email addresses
      const emails = supplierEmails
        .split(/[,;\n]/)
        .map(email => email.trim())
        .filter(email => email && /\S+@\S+\.\S+/.test(email));

      if (emails.length === 0) {
        toast({
          title: "Error",
          description: "Please enter valid email addresses",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-rfq-magic-links', {
        body: {
          rfqId: rfq.id,
          supplierEmails: emails,
          rfqTitle: rfq.title,
          rfqDescription: rfq.description,
          deadline: rfq.deadline
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Magic links sent to ${data.emailsSent} suppliers successfully`,
      });

      setSupplierEmails('');
      setSelectedRFQ(null);
    } catch (error: any) {
      console.error('Error sending magic links:', error);
      toast({
        title: "Error",
        description: "Failed to send magic links to suppliers",
        variant: "destructive",
      });
    } finally {
      setSendingMagicLinks(false);
    }
  };

  const acceptRFQResponse = async (responseId: string, rfqId: string) => {
    try {
      // Mark response as accepted
      const { error: responseError } = await supabase
        .from('rfq_responses')
        .update({ 
          status: 'accepted',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', responseId);

      if (responseError) throw responseError;

      // Get the response data to update the quote
      const { data: response, error: fetchError } = await supabase
        .from('rfq_responses')
        .select('response_data, rfq_id')
        .eq('id', responseId)
        .single();

      if (fetchError) throw fetchError;

      // Get the quote associated with this RFQ
      const { data: rfq, error: rfqError } = await supabase
        .from('rfqs')
        .select('quote_id')
        .eq('id', rfqId)
        .single();

      if (rfqError) throw rfqError;

      // Update the quote with the accepted response data
      const responseData = response.response_data as any;
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          total_amount: responseData.total_amount || 0,
          currency: responseData.currency || 'USD',
          status: 'sent' // Ready to send to customer
        })
        .eq('id', rfq.quote_id);

      if (quoteError) throw quoteError;

      toast({
        title: "Success",
        description: "RFQ response accepted and quote updated",
      });

      fetchRFQs();
    } catch (error) {
      console.error('Error accepting RFQ response:', error);
      toast({
        title: "Error",
        description: "Failed to accept RFQ response",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getResponseStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRFQs = rfqs.filter(rfq => 
    rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.quotes.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.quotes.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RFQ Management</h1>
          <p className="text-muted-foreground">
            Manage requests for quotes and supplier responses via magic links
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rfqs">RFQ List</TabsTrigger>
          <TabsTrigger value="comparison">Quote Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="rfqs" className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search RFQs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredRFQs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs found</h3>
                  <p className="text-gray-500">
                    RFQs are automatically created when quotes require supplier input.
                  </p>
                </CardContent>
              </Card>
            ) : (
          filteredRFQs.map(rfq => (
            <Card key={rfq.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{rfq.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(rfq.status)}>
                        {rfq.status}
                      </Badge>
                      <Badge variant="outline">
                        Quote: {rfq.quotes.quote_number}
                      </Badge>
                      <Badge variant="outline">
                        {rfq.rfq_responses.length} Response(s)
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-medium">
                      {rfq.quotes.customers?.company_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Target: {rfq.quotes.currency} {rfq.quotes.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rfq.description && (
                    <p className="text-sm text-muted-foreground">{rfq.description}</p>
                  )}
                  
                  {rfq.deadline && (
                    <p className="text-sm">
                      <strong>Deadline:</strong> {new Date(rfq.deadline).toLocaleDateString()}
                    </p>
                  )}

                  {rfq.rfq_responses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Supplier Responses:</h4>
                      {rfq.rfq_responses.map(response => (
                        <div key={response.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{response.suppliers.name}</span>
                            <Badge className={getResponseStatusColor(response.status)}>
                              {response.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {(response.response_data as any)?.currency || 'USD'} {((response.response_data as any)?.total_amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            {response.status === 'pending' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => acceptRFQResponse(response.id, rfq.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Accept
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(rfq.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedRFQ(rfq)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Magic Links
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Send RFQ Magic Links</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">RFQ Details:</label>
                              <div className="bg-gray-50 p-3 rounded-lg mt-2">
                                <p><strong>Title:</strong> {selectedRFQ?.title}</p>
                                {selectedRFQ?.description && (
                                  <p><strong>Description:</strong> {selectedRFQ.description}</p>
                                )}
                                {selectedRFQ?.deadline && (
                                  <p><strong>Deadline:</strong> {new Date(selectedRFQ.deadline).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Supplier Email Addresses:</label>
                              <p className="text-xs text-muted-foreground mb-2">
                                Enter email addresses separated by commas, semicolons, or new lines
                              </p>
                              <Textarea
                                placeholder="supplier1@email.com, supplier2@email.com&#10;supplier3@email.com"
                                value={supplierEmails}
                                onChange={(e) => setSupplierEmails(e.target.value)}
                                rows={4}
                              />
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Magic Link Benefits:</strong> Suppliers receive secure, time-limited links 
                                to submit quotes without needing accounts. Links expire in 7 days.
                              </p>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setSelectedRFQ(null)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => selectedRFQ && sendMagicLinks(selectedRFQ)}
                                disabled={sendingMagicLinks}
                              >
                                {sendingMagicLinks ? 'Sending...' : 'Send Magic Links'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setActiveTab('comparison')}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Compare Quotes
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {filteredRFQs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No RFQs Available</h3>
                <p className="text-gray-500">
                  Create RFQs first to compare supplier quotes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredRFQs.map(rfq => (
                <QuoteComparison 
                  key={rfq.id} 
                  rfqId={rfq.id} 
                  rfqTitle={rfq.title}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RFQManagement;