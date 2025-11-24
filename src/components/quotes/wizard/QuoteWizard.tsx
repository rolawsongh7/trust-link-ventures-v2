import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { InlineCustomerForm } from './InlineCustomerForm';
import { ProductCatalogSelector } from './ProductCatalogSelector';
import { CustomItemDialog } from './CustomItemDialog';

interface QuoteWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuoteCreated: () => void;
}

export const QuoteWizard: React.FC<QuoteWizardProps> = ({
  open,
  onOpenChange,
  onQuoteCreated
}) => {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [customItemDialogOpen, setCustomItemDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendViewOnlyLink, setSendViewOnlyLink] = useState(false);
  const [applyTax, setApplyTax] = useState(false);
  const [taxRate] = useState(21.0);
  const [applyShipping, setApplyShipping] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      title: '',
      customer_id: '',
      currency: 'USD',
      valid_until: '',
      description: '',
      notes: '',
      origin_type: 'manual'
    }
  });

  const selectedCustomerId = form.watch('customer_id');
  const currency = form.watch('currency');

  useEffect(() => {
    if (open) {
      fetchCustomers();
      setStep(1);
      setSelectedItems([]);
      setShowAddCustomer(false);
      form.reset();
    }
  }, [open]);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('company_name');

    if (!error && data) {
      setCustomers(data);
    }
  };

  const handleCustomerCreated = (customerId: string, customerData: any) => {
    setCustomers(prev => [customerData, ...prev]);
    form.setValue('customer_id', customerId);
    setShowAddCustomer(false);
    toast({
      title: 'Customer Created',
      description: `${customerData.company_name} added successfully`
    });
  };

  const handleAddCustomItem = (item: any) => {
    setSelectedItems(prev => [...prev, item]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateTax = () => {
    if (!applyTax) return 0;
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    const shipping = applyShipping ? shippingFee : 0;
    return subtotal + tax + shipping;
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add at least one item to the quote',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = form.getValues();
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const totalAmount = calculateTotal();

      // Generate quote number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const quoteNumber = `QT-${year}${month}${day}-${random}`;

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          quote_number: quoteNumber,
          customer_id: formData.customer_id,
          title: formData.title || undefined,
          description: formData.description,
          notes: formData.notes,
          currency: formData.currency,
          valid_until: formData.valid_until || undefined,
          subtotal: subtotal,
          tax_rate: applyTax ? taxRate : 0,
          tax_amount: taxAmount,
          shipping_fee: applyShipping ? shippingFee : 0,
          total_amount: totalAmount,
          status: 'draft',
          origin_type: formData.origin_type
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote items
      const itemsToInsert = selectedItems.map(item => ({
        quote_id: quote.id,
        product_name: item.productName,
        product_description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
        specifications: item.specifications
      }));

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Quote Created',
        description: `Quote ${quote.quote_number} created successfully`
      });

      // Send view-only link if requested
      if (sendViewOnlyLink && selectedCustomer?.email) {
        try {
          await supabase.functions.invoke('send-quote-email', {
            body: {
              quoteId: quote.id,
              quoteNumber: quote.quote_number,
              customerEmail: selectedCustomer.email,
              customerName: selectedCustomer.contact_name || selectedCustomer.company_name,
              sendViewOnlyLink: true
            }
          });

          toast({
            title: 'View-Only Link Sent',
            description: 'Customer will receive a secure link to view the quote'
          });
        } catch (emailError) {
          console.error('Error sending view-only link:', emailError);
          toast({
            title: 'Email Failed',
            description: 'Quote created but failed to send view-only link',
            variant: 'destructive'
          });
        }
      }

      onQuoteCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to create quote',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToStep2 = selectedCustomerId && !showAddCustomer;
  const canProceedToStep3 = selectedItems.length > 0;

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Manual Quote</DialogTitle>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 pb-4 border-b">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                1
              </div>
              <span className="text-sm font-medium hidden sm:inline">Customer</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Products</span>
            </div>
            <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                3
              </div>
              <span className="text-sm font-medium hidden sm:inline">Review</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4">
            {step === 1 && (
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quote Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Leave blank for auto-generated title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!showAddCustomer && (
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <div className="p-2 border-b">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => setShowAddCustomer(true)}
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add New Customer
                                </Button>
                              </div>
                              {customers.map(customer => (
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
                  )}

                  {showAddCustomer && (
                    <InlineCustomerForm
                      onCustomerCreated={handleCustomerCreated}
                      onCancel={() => setShowAddCustomer(false)}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Quote description..." {...field} />
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
                </div>
              </Form>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <ProductCatalogSelector
                  selectedItems={selectedItems}
                  onItemsChange={setSelectedItems}
                  onAddCustomItem={() => setCustomItemDialogOpen(true)}
                  currency={currency}
                />

                {/* Tax & Shipping Options */}
                <div className="space-y-4 pt-6 border-t">
                  <h3 className="font-semibold">Tax & Shipping Options</h3>
                  
                  {/* Tax Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="wizard-apply-tax" className="text-base font-semibold cursor-pointer">
                        Apply Ghanaian Tax (21%)
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        VAT, NHIL, GETFL, and COVID-19 Levy
                      </p>
                    </div>
                    <Switch
                      id="wizard-apply-tax"
                      checked={applyTax}
                      onCheckedChange={setApplyTax}
                    />
                  </div>

                  {/* Shipping Toggle */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label htmlFor="wizard-apply-shipping" className="text-base font-semibold cursor-pointer">
                        Add Shipping Fee
                      </Label>
                      <Switch
                        id="wizard-apply-shipping"
                        checked={applyShipping}
                        onCheckedChange={setApplyShipping}
                      />
                    </div>
                    {applyShipping && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-muted-foreground">{currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency}</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={shippingFee}
                          onChange={(e) => setShippingFee(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="max-w-[200px]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <h3 className="font-semibold mb-2">Quote Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Customer:</div>
                    <div className="font-medium">{selectedCustomer?.company_name}</div>
                    <div className="text-muted-foreground">Email:</div>
                    <div>{selectedCustomer?.email || 'N/A'}</div>
                    <div className="text-muted-foreground">Currency:</div>
                    <div>{currency}</div>
                    <div className="text-muted-foreground">Valid Until:</div>
                    <div>{form.getValues('valid_until') || 'Not set'}</div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="sendViewOnlyLink"
                      checked={sendViewOnlyLink}
                      onChange={(e) => setSendViewOnlyLink(e.target.checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor="sendViewOnlyLink" className="font-medium text-sm cursor-pointer">
                        Send view-only link (for customers without accounts)
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customer will receive a secure magic link to view the quote without logging in
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-semibold">Quote Items</h3>
                  </div>
                  <div className="divide-y max-h-[300px] overflow-y-auto">
                    {selectedItems.map((item, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{item.productName}</div>
                          {item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.quantity} {item.unit} × {currency} {item.unitPrice.toFixed(2)} = {currency} {(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t bg-muted/30 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{currency} {calculateSubtotal().toFixed(2)}</span>
                    </div>
                    
                    {applyTax && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax (21%):</span>
                        <span className="font-medium">{currency} {calculateTax().toFixed(2)}</span>
                      </div>
                    )}
                    
                    {applyShipping && shippingFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Shipping Fee:</span>
                        <span className="font-medium">{currency} {shippingFee.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>{currency} {calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Quote
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CustomItemDialog
        open={customItemDialogOpen}
        onOpenChange={setCustomItemDialogOpen}
        onAddItem={handleAddCustomItem}
        currency={currency}
      />
    </>
  );
};
