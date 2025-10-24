import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'error'>('verifying');
  const [message, setMessage] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const reference = searchParams.get('reference') || sessionStorage.getItem('pending_payment_reference');
      const orderId = searchParams.get('orderId') || sessionStorage.getItem('pending_order_id');

      if (!reference) {
        setStatus('error');
        setMessage('No payment reference found');
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-ghipss-payment', {
        body: { reference }
      });

      if (error) throw error;

      sessionStorage.removeItem('pending_payment_reference');
      sessionStorage.removeItem('pending_order_id');

      if (data.status === 'success') {
        setStatus('success');
        setOrderNumber(data.orderNumber);
        setMessage('Your payment has been confirmed successfully!');
        
        toast.success('Payment Successful!', {
          description: `Order ${data.orderNumber} is being processed.`
        });

        setTimeout(() => {
          navigate('/customer/orders');
        }, 3000);

      } else if (data.status === 'pending') {
        setMessage('Payment is being processed. Please wait...');
        
        if (retryCount < 6) {
          setTimeout(() => {
            setRetryCount(retryCount + 1);
            verifyPayment();
          }, 5000);
        } else {
          setStatus('error');
          setMessage('Payment verification is taking longer than expected. Please check your orders page.');
        }

      } else {
        setStatus('failed');
        setMessage(data.message || 'Payment failed or was cancelled');
      }

    } catch (error: any) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">{message || 'Please wait while we confirm your payment...'}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
              <p className="text-muted-foreground mb-4">{message}</p>
              {orderNumber && (
                <p className="text-sm font-medium mb-6">
                  Order Number: <span className="text-primary">{orderNumber}</span>
                </p>
              )}
              <Button onClick={() => navigate('/customer/orders')}>
                View My Orders
              </Button>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/customer/orders')}>
                  View Orders
                </Button>
                <Button onClick={() => navigate('/customer/quotes')}>
                  Try Again
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-10 w-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-amber-600 mb-2">Verification Error</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <p className="text-sm text-muted-foreground mb-6">
                If payment was deducted from your account, please contact support with your transaction reference.
              </p>
              <Button onClick={() => navigate('/customer/orders')}>
                Back to Orders
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallback;
