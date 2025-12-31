import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuoteToOrderConverterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  onOrderCreated: () => void;
}

export const QuoteToOrderConverter: React.FC<QuoteToOrderConverterProps> = ({
  open,
  onOpenChange,
  quote,
  onOrderCreated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingOrderInfo, setExistingOrderInfo] = useState<{ id: string; order_number: string } | null>(null);
  const [checkingOrder, setCheckingOrder] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      confirmationMethod: 'phone',
      confirmationNotes: '',
      paymentMethod: 'bank_transfer',
      orderStatus: 'pending_payment'
    }
  });

  // Pre-flight check when dialog opens
  React.useEffect(() => {
    const checkExistingOrder = async () => {
      if (open && quote?.id) {
        setCheckingOrder(true);
        try {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id, order_number')
            .or(`quote_id.eq.${quote.id},source_quote_id.eq.${quote.id}`)
            .maybeSingle();
          
          setExistingOrderInfo(existingOrder);
        } catch (error) {
          console.error('Error checking existing order:', error);
        } finally {
          setCheckingOrder(false);
        }
      } else {
        setExistingOrderInfo(null);
      }
    };
    checkExistingOrder();
  }, [open, quote?.id]);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Check if an order already exists for this quote
      const { data: existingOrder, error: existingOrderError } = await supabase
        .from('orders')
        .select('id, order_number')
        .or(`quote_id.eq.${quote.id},source_quote_id.eq.${quote.id}`)
        .maybeSingle();

      if (existingOrderError) {
        console.error('Error checking existing order:', existingOrderError);
      }

      if (existingOrder) {
        toast({
          title: 'Order Already Exists',
          description: `Order ${existingOrder.order_number} already exists for this quote.`,
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Fetch quote items
      const { data: quoteItems, error: itemsError } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quote.id);

      if (itemsError) throw itemsError;

      // Generate order number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const orderNumber = `ORD-${year}${month}-${random}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          quote_id: quote.id,
          source_quote_id: quote.id,
          customer_id: quote.customer_id,
          total_amount: quote.total_amount,
          currency: quote.currency,
          status: data.orderStatus,
          payment_method: data.paymentMethod,
          manual_confirmation_method: data.confirmationMethod,
          manual_confirmation_notes: data.confirmationNotes,
          notes: `Manually converted from Quote ${quote.quote_number}\n\nConfirmation Method: ${data.confirmationMethod}\nNotes: ${data.confirmationNotes}`
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsToInsert = quoteItems.map(item => ({
        order_id: order.id,
        product_name: item.product_name,
        product_description: item.product_description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        specifications: item.specifications
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) throw orderItemsError;

      // Update quote status
      const { error: quoteUpdateError } = await supabase
        .from('quotes')
        .update({
          status: 'converted'
        })
        .eq('id', quote.id);

      if (quoteUpdateError) throw quoteUpdateError;

      // Update linked quote_request status to 'converted' as well
      const { data: quoteData } = await supabase
        .from('quotes')
        .select('linked_quote_request_id')
        .eq('id', quote.id)
        .single();

      if (quoteData?.linked_quote_request_id) {
        await supabase
          .from('quote_requests')
          .update({ status: 'converted' })
          .eq('id', quoteData.linked_quote_request_id);
      }

      // Log audit event
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        event_type: 'quote_converted_to_order',
        action: 'convert',
        resource_type: 'order',
        resource_id: order.id,
        event_data: {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          order_number: order.order_number,
          order_id: order.id,
          conversion_type: 'manual',
          confirmation_method: data.confirmationMethod,
          payment_method: data.paymentMethod,
          initial_status: data.orderStatus,
          total_amount: quote.total_amount,
          currency: quote.currency,
          confirmation_notes: data.confirmationNotes
        },
        severity: 'low'
      });

      toast({
        title: 'Order Created',
        description: `Order ${order.order_number} created from Quote ${quote.quote_number}`
      });

      onOrderCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error converting quote to order:', error);
      toast({
        title: 'Error',
        description: 'Failed to convert quote to order',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Convert Quote to Order</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <div className="space-y-4">
            {checkingOrder ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Checking for existing orders...</span>
              </div>
            ) : existingOrderInfo ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Order already exists for this quote.</strong>
                  <br />
                  Order <span className="font-mono font-bold">{existingOrderInfo.order_number}</span> has already been created from this quote.
                  You cannot create another order.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will create an order without customer acceptance. Use this for phone confirmations,
                  WhatsApp messages, or in-person agreements.
                </AlertDescription>
              </Alert>
            )}

            <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Quote:</div>
                <div className="font-medium">{quote?.quote_number}</div>
                <div className="text-muted-foreground">Customer:</div>
                <div className="font-medium">{quote?.customers?.company_name}</div>
                <div className="text-muted-foreground">Total:</div>
                <div className="font-medium">{quote?.currency} {quote?.total_amount?.toFixed(2)}</div>
              </div>
            </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="confirmationMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="phone" id="phone" />
                        <Label htmlFor="phone">Phone Call</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="whatsapp" id="whatsapp" />
                        <Label htmlFor="whatsapp">WhatsApp</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_person" id="in_person" />
                        <Label htmlFor="in_person">In-Person</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="email" />
                        <Label htmlFor="email">Email</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmationNotes"
              rules={{ required: 'Please provide confirmation details' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation Notes *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe how the order was confirmed. Include contact name, date/time, and any key details..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">Cash</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mobile_money" id="mobile" />
                        <Label htmlFor="mobile">Mobile Money</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank_transfer" id="bank" />
                        <Label htmlFor="bank">Bank Transfer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credit" id="credit" />
                        <Label htmlFor="credit">Credit Terms</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Order Status *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pending_payment" id="pending" />
                        <Label htmlFor="pending">Payment Pending</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="payment_received" id="received" />
                        <Label htmlFor="received">Payment Confirmed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="processing" id="processing" />
                        <Label htmlFor="processing">Processing</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || checkingOrder || !!existingOrderInfo} 
          onClick={form.handleSubmit(onSubmit)}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Order
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
};
