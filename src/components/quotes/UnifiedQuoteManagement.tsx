import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Eye, Edit, CheckCircle, XCircle, Clock, FileText, FileImage, Upload, Download, ThumbsUp, FileCheck, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import QuoteUploadDialog from './QuoteUploadDialog';
import { SimpleQuoteUpload } from './SimpleQuoteUpload';
import { useAuth } from '@/contexts/AuthContext';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  description?: string;
  total_amount: number;
  currency: string;
  status: string;
  origin_type: string;
  valid_until?: string;
  created_at: string;
  file_url?: string;
  final_file_url?: string;
  linked_quote_request_id?: string;
  supplier_quote_uploaded_at?: string;
  approved_by?: string;
  approved_at?: string;
  sent_at?: string;
  customers?: {
    company_name: string;
    contact_name?: string;
    email?: string;
  };
  leads?: {
    title: string;
  };
  rfqs?: {
    id: string;
    status: string;
    deadline?: string;
  }[];
  orders?: {
    id: string;
    order_number: string;
    status: string;
  }[];
}

const UnifiedQuoteManagement = () => {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedQuoteForUpload, setSelectedQuoteForUpload] = useState<Quote | null>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      title: '',
      customer_id: '',
      total_amount: 0,
      currency: 'USD',
      status: 'draft',
      valid_until: '',
      description: '',
      notes: '',
      origin_type: 'manual'
    }
  });

  useEffect(() => {
    fetchQuotes();
    fetchCustomers();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('quotes-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        () => fetchQuotes()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const generateQuoteNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `QT-${year}${month}${day}-${random}`;
  };

  const onSubmit = async (data: any) => {
    try {
      const submitData = {
        ...data,
        quote_number: generateQuoteNumber(),
        total_amount: Number(data.total_amount)
      };

      const { error } = await supabase
        .from('quotes')
        .insert([submitData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote created successfully",
      });

      setIsDialogOpen(false);
      form.reset();
      fetchQuotes();
    } catch (error: any) {
      console.error('Error creating quote:', error);
      toast({
        title: "Error",
        description: "Failed to create quote",
        variant: "destructive",
      });
    }
  };

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customers(company_name, contact_name),
          leads(title),
          rfqs(id, status, deadline),
          orders(id, order_number, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quote ${status === 'accepted' ? 'accepted and converted to order' : `marked as ${status}`}`,
      });

      fetchQuotes();
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
    }
  };

  const generateTitlePage = async (quoteId: string) => {
    try {
      toast({
        title: "Generating title page...",
        description: "Please wait while we create the title page for your quote.",
      });

      const { data, error } = await supabase.functions.invoke('generate-quote-title-page', {
        body: { quoteId }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Title page generated and merged with quote successfully",
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error generating title page:', error);
      toast({
        title: "Error",
        description: "Failed to generate title page",
        variant: "destructive",
      });
    }
  };

  const sendQuoteApprovalLink = async (quote: Quote) => {
    try {
      // Check if customer email is available
      let customerEmail = quote.customers?.contact_name; // Assuming this might contain email
      if (!customerEmail) {
        // Prompt for email
        customerEmail = prompt('Please enter the customer email address:');
        if (!customerEmail) return;
      }

      toast({
        title: "Sending approval link...",
        description: "Please wait while we send the quote approval link.",
      });

      const { data, error } = await supabase.functions.invoke('send-quote-approval-link', {
        body: {
          quoteId: quote.id,
          customerEmail: customerEmail,
          customerName: quote.customers?.contact_name,
          companyName: quote.customers?.company_name
        }
      });

      if (error) throw error;

      // Update sent timestamp
      await supabase
        .from('quotes')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', quote.id);

      toast({
        title: "Success",
        description: "Quote approval link sent successfully to " + customerEmail,
      });
      
      fetchQuotes();
    } catch (error: any) {
      console.error('Error sending quote approval link:', error);
      toast({
        title: "Error",
        description: "Failed to send quote approval link",
        variant: "destructive",
      });
    }
  };

  const approveQuote = async (quoteId: string) => {
    try {
      // First approve the quote
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Get quote details to send to customer
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('*, customers(company_name, contact_name, email)')
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;

      // Send to customer
      await sendQuoteApprovalLink(quote);

      toast({
        title: "Success",
        description: "Quote approved and sent to customer",
      });

      fetchQuotes();
    } catch (error: any) {
      console.error('Error approving quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve and send quote",
        variant: "destructive",
      });
    }
  };

  const downloadQuote = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const getOriginTypeColor = (origin_type: string) => {
    switch (origin_type) {
      case 'direct': return 'bg-purple-100 text-purple-800';
      case 'rfq': return 'bg-orange-100 text-orange-800';
      case 'manual': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.customers?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = selectedTab === 'all' || quote.status === selectedTab;
    
    return matchesSearch && matchesTab;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Quote Management</h1>
          <p className="text-muted-foreground">
            Unified view of all quotes, RFQs, and order conversions
          </p>
        </div>
        <div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Quote</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quote title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="GHS">GHS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="origin_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quote Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="rfq">RFQ Required</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid Until</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter quote description..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Quote
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search quotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All ({quotes.length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({quotes.filter(q => q.status === 'draft').length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({quotes.filter(q => q.status === 'sent').length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({quotes.filter(q => q.status === 'accepted').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({quotes.filter(q => q.status === 'rejected').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Start by creating your first quote.'}
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quote
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredQuotes.map(quote => (
              <Card key={quote.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {quote.quote_number} - {quote.title}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(quote.status)}>
                          {quote.status}
                        </Badge>
                        <Badge className={getOriginTypeColor(quote.origin_type)}>
                          {quote.origin_type}
                        </Badge>
                        {quote.rfqs && quote.rfqs.length > 0 && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            RFQ Active
                          </Badge>
                        )}
                        {quote.orders && quote.orders.length > 0 && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Order: {quote.orders[0].order_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {quote.currency} {quote.total_amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {quote.customers?.company_name || quote.leads?.title}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                      {quote.valid_until && (
                        <p className="text-sm text-muted-foreground">
                          Valid until: {new Date(quote.valid_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Step 1: Upload Supplier Quote - only if no supplier quote uploaded yet */}
                      {!quote.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQuoteForUpload(quote)}
                        >
                          <Upload className="mr-1 h-3 w-3" />
                          Upload Quote
                        </Button>
                      )}
                      
                      {/* Step 2: Generate Title Page - only if supplier quote uploaded but no final quote */}
                      {quote.file_url && !quote.final_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateTitlePage(quote.id)}
                        >
                          <FileCheck className="mr-1 h-3 w-3" />
                          Generate Title Page
                        </Button>
                      )}
                      
                      {/* Step 3: Approve - only if final quote exists but not approved */}
                      {quote.final_file_url && quote.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => approveQuote(quote.id)}
                        >
                          <ThumbsUp className="mr-1 h-3 w-3" />
                          Approve & Send
                        </Button>
                      )}
                      
                      {/* Download buttons */}
                      {quote.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQuote(quote.file_url!, `supplier-quote-${quote.quote_number}.pdf`)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Supplier PDF
                        </Button>
                      )}
                      {quote.final_file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQuote(quote.final_file_url!, `final-quote-${quote.quote_number}.pdf`)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          Final Quote
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <QuoteUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onUploadComplete={fetchQuotes}
      />

      {selectedQuoteForUpload && (
        <SimpleQuoteUpload
          open={!!selectedQuoteForUpload}
          onOpenChange={(open) => !open && setSelectedQuoteForUpload(null)}
          quoteId={selectedQuoteForUpload.id}
          quoteNumber={selectedQuoteForUpload.quote_number}
          onSuccess={fetchQuotes}
        />
      )}
    </div>
  );
};

export default UnifiedQuoteManagement;