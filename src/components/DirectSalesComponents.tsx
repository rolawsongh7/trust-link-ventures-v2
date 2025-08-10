import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Trash2, Building2, User, DollarSign, Zap, ArrowRight } from 'lucide-react';

interface QuoteItem {
  id: string;
  product_name: string;
  product_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
}

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  country: string;
}

const DirectSalesComponents = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, email, country')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Option A: Direct Customer + Quote Creation
  const DirectCustomerQuote = () => {
    const [customerData, setCustomerData] = useState({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      country: '',
      industry: 'Food & Beverage'
    });
    const [quoteData, setQuoteData] = useState({
      quote_number: `QUO-${Date.now()}`,
      title: '',
      description: '',
      valid_until: '',
      notes: ''
    });
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [newItem, setNewItem] = useState({
      product_name: '',
      product_description: '',
      quantity: 1,
      unit: 'kg',
      unit_price: 0
    });
    const [showDialog, setShowDialog] = useState(false);

    const addItem = () => {
      if (!newItem.product_name || newItem.unit_price <= 0) {
        toast({
          title: "Error",
          description: "Please fill in all item details",
          variant: "destructive",
        });
        return;
      }

      const item: QuoteItem = {
        id: Date.now().toString(),
        ...newItem,
        total_price: newItem.quantity * newItem.unit_price
      };

      setItems([...items, item]);
      setNewItem({
        product_name: '',
        product_description: '',
        quantity: 1,
        unit: 'kg',
        unit_price: 0
      });
    };

    const removeItem = (id: string) => {
      setItems(items.filter(item => item.id !== id));
    };

    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);

    const handleSubmit = async () => {
      if (!customerData.company_name || !customerData.contact_name || !customerData.email || items.length === 0) {
        toast({
          title: "Error",
          description: "Please fill in all required fields and add at least one item",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      try {
        // 1. Create customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            ...customerData,
            customer_status: 'prospect',
            priority: 'high',
            notes: 'Created via direct quote entry'
          }])
          .select()
          .single();

        if (customerError) throw customerError;

        // 2. Create quote
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            ...quoteData,
            customer_id: customer.id,
            status: 'draft',
            total_amount: totalAmount,
            currency: 'USD'
          }])
          .select()
          .single();

        if (quoteError) throw quoteError;

        // 3. Create activity
        await supabase
          .from('activities')
          .insert([{
            customer_id: customer.id,
            activity_type: 'quote_created',
            subject: `Direct quote created - ${quoteData.quote_number}`,
            description: `New customer and quote created directly.\nQuote Value: $${totalAmount.toLocaleString()}\nItems: ${items.length}`,
            status: 'completed'
          }]);

        toast({
          title: "Success",
          description: "Customer and quote created successfully!",
        });
        setShowDialog(false);
        fetchCustomers();
        
        // Reset forms
        setCustomerData({
          company_name: '',
          contact_name: '',
          email: '',
          phone: '',
          country: '',
          industry: 'Food & Beverage'
        });
        setItems([]);
        setQuoteData({
          quote_number: `QUO-${Date.now()}`,
          title: '',
          description: '',
          valid_until: '',
          notes: ''
        });

      } catch (error) {
        console.error('Error creating customer and quote:', error);
        toast({
          title: "Error",
          description: "Failed to create customer and quote",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Building2 className="h-4 w-4" />
            Option A: Direct Customer + Quote
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create New Customer + Direct Quote
            </DialogTitle>
            <DialogDescription>
              Skip the lead stage - create a new customer and quote simultaneously
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={customerData.company_name}
                      onChange={(e) => setCustomerData({...customerData, company_name: e.target.value})}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input
                      value={customerData.contact_name}
                      onChange={(e) => setCustomerData({...customerData, contact_name: e.target.value})}
                      placeholder="Enter contact person"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={customerData.country}
                      onChange={(e) => setCustomerData({...customerData, country: e.target.value})}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input
                      value={customerData.industry}
                      onChange={(e) => setCustomerData({...customerData, industry: e.target.value})}
                      placeholder="Enter industry"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quote Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quote Number</Label>
                    <Input
                      value={quoteData.quote_number}
                      onChange={(e) => setQuoteData({...quoteData, quote_number: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={quoteData.valid_until}
                      onChange={(e) => setQuoteData({...quoteData, valid_until: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={quoteData.title}
                    onChange={(e) => setQuoteData({...quoteData, title: e.target.value})}
                    placeholder="Quote title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={quoteData.description}
                    onChange={(e) => setQuoteData({...quoteData, description: e.target.value})}
                    placeholder="Quote description"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={quoteData.notes}
                    onChange={(e) => setQuoteData({...quoteData, notes: e.target.value})}
                    placeholder="Additional quote notes"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Quote Items */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Quote Items</CardTitle>
                  <Badge variant="secondary">
                    Total: ${totalAmount.toLocaleString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Item Form */}
                <div className="grid grid-cols-5 gap-2 p-4 bg-muted rounded-lg">
                  <Input
                    placeholder="Product name"
                    value={newItem.product_name}
                    onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                  />
                  <Input
                    placeholder="Description"
                    value={newItem.product_description}
                    onChange={(e) => setNewItem({...newItem, product_description: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                  />
                  <Input
                    placeholder="Unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({...newItem, unit_price: Number(e.target.value)})}
                    />
                    <Button onClick={addItem} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Items List */}
                {items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.product_description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>${item.unit_price}</TableCell>
                          <TableCell>${item.total_price}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {loading ? 'Creating...' : 'Create Customer + Quote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Direct Sales Options
          </CardTitle>
          <CardDescription>
            For customers who know exactly what they want - skip the traditional lead process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DirectCustomerQuote />
            
            <Button className="gap-2" variant="outline">
              <ArrowRight className="h-4 w-4" />
              Option B: Fast-Track Process
            </Button>
            
            <Button className="gap-2" variant="outline">
              <User className="h-4 w-4" />
              Option C: Direct Quote Entry
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">Sales Process Options:</h4>
            <ul className="space-y-1">
              <li><strong>Option A:</strong> Skip leads entirely - create customer and quote together</li>
              <li><strong>Option B:</strong> Automated workflow - lead → customer → quote</li>
              <li><strong>Option C:</strong> Direct quote creation for existing customers</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectSalesComponents;