import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Calculator, Save, DollarSign } from 'lucide-react';

interface QuoteItem {
  id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  specifications?: string;
}

interface QuoteEditorProps {
  quoteId: string;
  quoteNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const QuoteEditor: React.FC<QuoteEditorProps> = ({
  quoteId,
  quoteNumber,
  open,
  onOpenChange,
  onSuccess
}) => {
  const { toast } = useToast();
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Payment terms: Net 30 days\nDelivery: FOB destination\nValidity: 30 days from quote date');
  const [applyTax, setApplyTax] = useState(false);
  const [taxRate, setTaxRate] = useState(21.0);
  const [applyShipping, setApplyShipping] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  

  useEffect(() => {
    if (open && quoteId) {
      fetchQuoteDetails();
    }
  }, [open, quoteId]);

  const fetchQuoteDetails = async () => {
    setLoading(true);
    try {
      console.log(`[QuoteEditor] Loading quote ${quoteId}...`);
      
      // Fetch quote details with linked_quote_request_id for potential recovery
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('currency, notes, terms, tax_rate, tax_amount, shipping_fee, subtotal, linked_quote_request_id')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('[QuoteEditor] Failed to fetch quote header:', quoteError);
        throw quoteError;
      }

      if (quote) {
        setCurrency(quote.currency || 'USD');
        setNotes(quote.notes || '');
        setTerms(quote.terms || 'Payment terms: Net 30 days\nDelivery: FOB destination\nValidity: 30 days from quote date');
        
        // Set tax and shipping state
        const hasTax = quote.tax_rate && quote.tax_rate > 0;
        const hasShipping = quote.shipping_fee && quote.shipping_fee > 0;
        setApplyTax(hasTax || false);
        setTaxRate(quote.tax_rate || 21.0);
        setApplyShipping(hasShipping || false);
        setShippingFee(quote.shipping_fee || 0);
      }

      // Fetch quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('[QuoteEditor] Failed to fetch quote items:', itemsError);
        throw itemsError;
      }

      // If no items found, try to recover from linked quote request
      if ((!quoteItems || quoteItems.length === 0) && quote?.linked_quote_request_id) {
        console.warn(`[QuoteEditor] No quote items found, attempting recovery from quote request ${quote.linked_quote_request_id}`);
        
        const { data: requestItems, error: requestItemsError } = await supabase
          .from('quote_request_items')
          .select('*')
          .eq('quote_request_id', quote.linked_quote_request_id);

        if (requestItemsError) {
          console.error('[QuoteEditor] Failed to fetch quote request items for recovery:', requestItemsError);
        } else if (requestItems && requestItems.length > 0) {
          console.log(`[QuoteEditor] Found ${requestItems.length} items in quote request, creating quote_items...`);
          
          // Create quote items from request items
          const newItems = requestItems.map(item => ({
            quote_id: quoteId,
            product_name: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: 0,
            total_price: 0,
            product_description: item.specifications || '',
            specifications: item.preferred_grade || ''
          }));

          const { data: insertedItems, error: insertError } = await supabase
            .from('quote_items')
            .insert(newItems)
            .select();

          if (insertError) {
            console.error('[QuoteEditor] Failed to recover quote items:', insertError);
            toast({
              title: "Warning",
              description: "Quote items were missing. Please try again or contact support.",
              variant: "destructive",
            });
          } else {
            console.log(`[QuoteEditor] Successfully recovered ${insertedItems?.length} quote items`);
            setItems(insertedItems || []);
            toast({
              title: "Items Recovered",
              description: `Recovered ${insertedItems?.length} items from the original request. Please set prices.`,
            });
            return;
          }
        }
      }

      // Handle case where no items exist
      if (!quoteItems || quoteItems.length === 0) {
        console.warn('[QuoteEditor] Quote has no items and no linked request to recover from');
        toast({
          title: "No Items Found",
          description: "This quote has no line items. You may need to add items manually.",
          variant: "destructive",
        });
      }

      setItems(quoteItems || []);
    } catch (error: any) {
      console.error('[QuoteEditor] Error fetching quote details:', error);
      toast({
        title: "Error",
        description: `Failed to load quote: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateItemPrice = (itemId: string, field: 'unit_price' | 'quantity', value: number) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          updatedItem.total_price = updatedItem.quantity * updatedItem.unit_price;
          return updatedItem;
        }
        return item;
      })
    );
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
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

  const handleSave = async (sendToCustomer: boolean = false) => {
    setSaving(true);
    try {
      // Update each quote item
      const updatePromises = items.map(item =>
        supabase
          .from('quote_items')
          .update({
            unit_price: item.unit_price,
            quantity: item.quantity,
            total_price: item.total_price
          })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);

      // Update quote total and other details
      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const totalAmount = calculateTotal();
      
      const updateData: any = {
        subtotal: subtotal,
        tax_rate: applyTax ? taxRate : 0,
        tax_amount: taxAmount,
        shipping_fee: applyShipping ? shippingFee : 0,
        total_amount: totalAmount,
        currency,
        notes,
        terms,
        status: 'draft' // Always save as draft - PDF generation comes next
      };

      const { error: quoteError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);

      if (quoteError) throw quoteError;

      toast({
        title: "Success",
        description: "Quote saved as draft. Next: Generate PDF → Review → Submit to Customer",
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quote Editor - {quoteNumber}
          </DialogTitle>
          <DialogDescription>
            Enter unit prices for each item to create the final quote
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quote Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quote Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Specifications</TableHead>
                      <TableHead className="w-24">Quantity</TableHead>
                      <TableHead className="w-20">Unit</TableHead>
                      <TableHead className="w-32">Unit Price</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product_name}
                          {item.product_description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.product_description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.specifications || '-'}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItemPrice(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{currencySymbol}</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItemPrice(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24"
                              placeholder="0.00"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {currencySymbol}{item.total_price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="text-right font-semibold">
                        Subtotal:
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{calculateSubtotal().toFixed(2)}
                      </TableCell>
                    </TableRow>
                    
                    {applyTax && (
                      <TableRow key="tax-row" className="border-t border-dashed">
                        <TableCell colSpan={5} className="text-right text-muted-foreground font-medium py-3">
                          Tax ({taxRate}%):
                        </TableCell>
                        <TableCell className="text-right font-medium py-3">
                          {currencySymbol}{calculateTax().toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {applyShipping && (
                      <TableRow key="shipping-row" className="border-t border-dashed">
                        <TableCell colSpan={5} className="text-right text-muted-foreground font-medium py-3">
                          Shipping Fee:
                        </TableCell>
                        <TableCell className="text-right font-medium py-3">
                          {currencySymbol}{shippingFee.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    
                    <TableRow className="bg-primary/10" key={`total-${applyTax}-${applyShipping}-${shippingFee}`}>
                      <TableCell colSpan={5} className="text-right font-bold">
                        Total Amount:
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {currencySymbol}{calculateTotal().toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Tax & Shipping Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tax & Shipping</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ghanaian Tax Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="apply-tax" className="text-base font-semibold cursor-pointer">
                        Apply Ghanaian Tax (21%)
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Includes VAT (15%), NHIL (2.5%), GETFL (2.5%), and COVID-19 Levy (1%)
                    </p>
                  </div>
                  <Switch
                    id="apply-tax"
                    checked={applyTax}
                    onCheckedChange={setApplyTax}
                  />
                </div>

                {/* Shipping Fee Toggle */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="apply-shipping" className="text-base font-semibold cursor-pointer">
                      Add Shipping Fee
                    </Label>
                    <Switch
                      id="apply-shipping"
                      checked={applyShipping}
                      onCheckedChange={setApplyShipping}
                    />
                  </div>
                  {applyShipping && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-muted-foreground">{currencySymbol}</span>
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
              </CardContent>
            </Card>

            {/* Quote Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="GHS">GHS (₵)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="flex items-center gap-2 h-10 px-3 py-2 border rounded-md bg-muted">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-bold">{calculateTotal().toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes for the customer..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Enter terms and conditions..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSave(false)}
                disabled={saving || calculateTotal() === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Quote
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

    </Dialog>
  );
};
