import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, CreditCard, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VerifyPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    order_number: string;
    payment_proof_url?: string;
    payment_reference?: string;
    payment_method?: string;
    payment_proof_uploaded_at?: string;
    customer_id: string;
    customers?: {
      email?: string;
      company_name?: string;
    };
  };
  onSuccess: () => void;
}

export const VerifyPaymentDialog: React.FC<VerifyPaymentDialogProps> = ({
  open,
  onOpenChange,
  order,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Not authenticated');

      // Step 1: Mark payment as received (required transition)
      const { error: paymentReceivedError } = await supabase
        .from('orders')
        .update({
          status: 'payment_received',
          payment_verified_by: user.id,
          payment_verified_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (paymentReceivedError) {
        console.error('Failed to mark payment as received:', paymentReceivedError);
        throw new Error(`Failed to confirm payment: ${paymentReceivedError.message}`);
      }

      // Step 2: Move to processing (valid transition from payment_received)
      const { error: processingError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
        })
        .eq('id', order.id);

      if (processingError) {
        console.error('Failed to move order to processing:', processingError);
        // Don't throw - payment is already confirmed
        toast({
          title: 'Partial Success',
          description: 'Payment confirmed but order not moved to processing. Please manually update status.',
          variant: 'destructive',
        });
        return;
      }

      // Send payment confirmation email to customer
      await supabase.functions.invoke('send-payment-confirmation', {
        body: {
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: order.customers?.email,
        },
      }).catch(err => {
        console.error('Email notification error (non-blocking):', err);
      });

      // Notify customer with system notification
      if (order.customer_id) {
        const { error: notifError } = await supabase.from('user_notifications').insert({
          user_id: order.customer_id,
          type: 'system',
          title: 'Payment Verified - Order Processing',
          message: `Great news! Your payment for order ${order.order_number} has been verified and your order is now being processed. We'll notify you when it's ready to ship.`,
          link: '/customer/orders',
        });
        
        if (notifError) {
          console.error('Customer notification error (non-blocking):', notifError);
        }
      }

      toast({
        title: 'Payment Verified & Processing Started',
        description: `Order ${order.order_number} payment confirmed and moved to processing automatically.`,
      });

      onSuccess();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Failed to verify payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review payment details and verify for order {order.order_number}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Payment Details */}
            <div className="grid grid-cols-2 gap-4">
...
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerify}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              'Verifying...'
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verify & Approve Payment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
