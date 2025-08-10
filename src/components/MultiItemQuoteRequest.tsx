import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, ShoppingCart, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface QuoteItem {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  specifications: string;
  preferred_grade: string;
}

interface QuoteDetails {
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  expected_delivery_date: string;
}

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
}

const MultiItemQuoteRequest = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
    title: '',
    message: '',
    urgency: 'medium',
    expected_delivery_date: ''
  });
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [newItem, setNewItem] = useState<Omit<QuoteItem, 'id'>>({
    product_name: '',
    quantity: 1,
    unit: 'kg',
    specifications: '',
    preferred_grade: ''
  });
  const [showAddItem, setShowAddItem] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, email')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const addItem = () => {
    if (!newItem.product_name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    const item: QuoteItem = {
      ...newItem,
      id: Date.now().toString()
    };

    setItems([...items, item]);
    setNewItem({
      product_name: '',
      quantity: 1,
      unit: 'kg',
      specifications: '',
      preferred_grade: ''
    });
    setShowAddItem(false);
    toast.success('Item added to quote request');
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Item removed from quote request');
  };

  const submitQuoteRequest = async () => {
    // Check if user is authenticated
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!quoteDetails.title.trim()) {
      toast.error('Please enter a quote title');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item to the quote request');
      return;
    }

    setLoading(true);

    try {
      // 1. Create quote request record
      const quoteRequestData = {
        request_type: 'customer',
        title: quoteDetails.title,
        message: quoteDetails.message,
        urgency: quoteDetails.urgency,
        expected_delivery_date: quoteDetails.expected_delivery_date || null,
        customer_id: selectedCustomer,
        status: 'pending'
      };

      const { data: quoteRequest, error: requestError } = await supabase
        .from('quote_requests')
        .insert([quoteRequestData])
        .select()
        .single();

      if (requestError) throw requestError;

      // 2. Insert related items
      const itemsData = items.map(item => ({
        quote_request_id: quoteRequest.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
        preferred_grade: item.preferred_grade
      }));

      const { error: itemsError } = await supabase
        .from('quote_request_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success('Quote request submitted successfully!');
      
      // Reset form
      setQuoteDetails({
        title: '',
        message: '',
        urgency: 'medium',
        expected_delivery_date: ''
      });
      setItems([]);
      setSelectedCustomer('');
      
    } catch (error) {
      console.error('Error submitting quote request:', error);
      toast.error('Failed to submit quote request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Create Quote Request
          </CardTitle>
          <CardDescription>
            Submit a detailed quote request with multiple items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Customer</label>
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name} - {customer.contact_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quote Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Quote Title</label>
              <Input
                value={quoteDetails.title}
                onChange={(e) => setQuoteDetails({...quoteDetails, title: e.target.value})}
                placeholder="e.g., Seafood Supply Request"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Urgency</label>
              <Select 
                value={quoteDetails.urgency} 
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setQuoteDetails({...quoteDetails, urgency: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Expected Delivery Date</label>
              <Input
                type="date"
                value={quoteDetails.expected_delivery_date}
                onChange={(e) => setQuoteDetails({...quoteDetails, expected_delivery_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Additional Message</label>
            <Textarea
              value={quoteDetails.message}
              onChange={(e) => setQuoteDetails({...quoteDetails, message: e.target.value})}
              placeholder="Provide any additional details about your requirements..."
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Request Items</h3>
              <Button
                onClick={() => setShowAddItem(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No items added yet</p>
                  <p className="text-sm text-muted-foreground">Click "Add Item" to start building your quote request</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            {item.preferred_grade && (
                              <Badge variant="outline">{item.preferred_grade}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.specifications || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              onClick={submitQuoteRequest}
              disabled={loading || items.length === 0}
              size="lg"
            >
              {loading ? 'Submitting...' : 'Submit Quote Request'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Quote Request</DialogTitle>
            <DialogDescription>
              Provide details about the product you need
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product Name</label>
              <Input
                value={newItem.product_name}
                onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                placeholder="e.g., Atlantic Salmon Fillets"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Unit</label>
                <Select 
                  value={newItem.unit} 
                  onValueChange={(value) => setNewItem({...newItem, unit: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms</SelectItem>
                    <SelectItem value="lbs">Pounds</SelectItem>
                    <SelectItem value="tons">Tons</SelectItem>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="boxes">Boxes</SelectItem>
                    <SelectItem value="containers">Containers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preferred Grade (Optional)</label>
              <Input
                value={newItem.preferred_grade}
                onChange={(e) => setNewItem({...newItem, preferred_grade: e.target.value})}
                placeholder="e.g., Grade A, Premium, Fresh"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Specifications (Optional)</label>
              <Textarea
                value={newItem.specifications}
                onChange={(e) => setNewItem({...newItem, specifications: e.target.value})}
                placeholder="Any specific requirements, packaging needs, or quality standards..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddItem(false)}
              >
                Cancel
              </Button>
              <Button onClick={addItem}>
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Prompt Dialog */}
      <Dialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Authentication Required
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to submit a quote request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                <span className="font-medium">Customer Access</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please log in with your customer account to submit quote requests and track their status.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setShowAuthPrompt(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MultiItemQuoteRequest;