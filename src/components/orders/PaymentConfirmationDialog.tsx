import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  deliveryAddressId?: string;
  onSuccess: () => void;
}

export const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerEmail,
  deliveryAddressId,
  onSuccess,
}) => {
  const [paymentReference, setPaymentReference] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirmPayment = async () => {
    if (!paymentReference.trim()) {
      toast.error('Payment reference is required');
      return;
    }

    setLoading(true);

    try {
      // Check if delivery address exists
      if (!deliveryAddressId) {
        // Request delivery address from customer
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            to: customerEmail,
            subject: `Delivery Address Required - Order ${orderNumber}`,
            templateType: 'delivery_address_request',
            templateData: {
              orderNumber,
              message: 'We have received your payment. Please provide your delivery address to complete your order.',
            },
          },
        });

        if (emailError) {
          console.error('Error sending delivery address request:', emailError);
        }

        toast.info('Delivery address request sent to customer. Invoice will be generated once address is provided.');
        
        // Update order with payment reference but keep in payment_received status
        await supabase
          .from('orders')
          .update({
            payment_reference: paymentReference,
            delivery_notes: deliveryNotes,
          })
          .eq('id', orderId);

        onSuccess();
        onOpenChange(false);
        return;
      }

      // Update order with payment details
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_reference: paymentReference,
          delivery_notes: deliveryNotes,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Generate invoice
      toast.loading('Generating invoice...');
      
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: {
          orderId,
          invoiceType: 'commercial',
          paymentReference,
          deliveryNotes,
        },
      });

      if (invoiceError) throw invoiceError;

      // Send invoice to customer
      const { error: sendError } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          orderId,
          customerEmail,
          invoiceData: invoiceData,
        },
      });

      if (sendError) {
        console.error('Error sending invoice email:', sendError);
        toast.warning('Invoice generated but email failed to send');
      }

      toast.success('Payment confirmed and invoice generated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Confirm Payment Received</DialogTitle>
          <DialogDescription>
            Enter payment confirmation details for order {orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="payment-reference">
              Payment Reference Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="payment-reference"
              placeholder="Enter payment confirmation/reference number"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-notes">Delivery Instructions (Optional)</Label>
            <Textarea
              id="delivery-notes"
              placeholder="Enter any special delivery instructions..."
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          {!deliveryAddressId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ No delivery address on file. Customer will be notified to provide delivery details before invoice can be generated.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPayment}
            disabled={loading || !paymentReference.trim()}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
