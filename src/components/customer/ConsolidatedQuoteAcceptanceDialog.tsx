import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  MapPin, 
  Plus, 
  Building2, 
  Smartphone,
  Loader2,
  AlertCircle,
  Mail,
  DollarSign,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface Address {
  id: string;
  receiver_name: string;
  phone_number: string;
  ghana_digital_address: string;
  region: string;
  city: string;
  area?: string;
  street_address: string;
  additional_directions?: string;
  is_default: boolean;
}

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  currency: string;
  customer_id?: string;
  customer_email?: string;
}

interface ConsolidatedQuoteAcceptanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onSuccess: () => void;
}

type Step = 'address' | 'payment-method' | 'payment-instructions';

export const ConsolidatedQuoteAcceptanceDialog: React.FC<ConsolidatedQuoteAcceptanceDialogProps> = ({
  open,
  onOpenChange,
  quote,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  const [currentStep, setCurrentStep] = useState<Step>('address');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'paystack' | 'manual' | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<any>(null);
  const [loadingPaymentOptions, setLoadingPaymentOptions] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string>('');


  useEffect(() => {
    if (open && profile) {
      fetchAddresses();
    }
  }, [open, profile]);

  const fetchAddresses = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', profile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAddresses(data || []);
      
      const defaultAddress = data?.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (data && data.length > 0) {
        setSelectedAddressId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load addresses',
        variant: 'destructive',
      });
    } finally {
      setLoadingAddresses(false);
    }
  };


  const handleProceedToPayment = async () => {
    if (!selectedAddressId) {
      toast({
        title: 'No Address Selected',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Accept quote and create order
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote?.id || '');

      if (quoteError) throw quoteError;

      // Wait for order creation
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, currency')
        .eq('quote_id', quote?.id || '')
        .single();

      if (orderError) throw orderError;

      // Update delivery address
      await supabase
        .from('orders')
        .update({
          delivery_address_id: selectedAddressId,
          delivery_address_confirmed_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Fetch payment options
      setLoadingPaymentOptions(true);
      const { data: options, error: optionsError } = await supabase.functions.invoke(
        'get-payment-options',
        { body: { orderId: order.id } }
      );

      if (optionsError) throw optionsError;

      setPaymentOptions(options);
      setCreatedOrderId(order.id);
      setCurrentStep('payment-method');

    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to proceed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setLoadingPaymentOptions(false);
    }
  };

  const handlePaymentMethodSelection = async () => {
    if (!selectedPaymentMethod) return;

    setSubmitting(true);
    try {
      if (selectedPaymentMethod === 'paystack') {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke(
          'initialize-paystack-payment',
          {
            body: {
              orderId: createdOrderId,
              customerEmail: profile?.email,
              customerPhone: profile?.phone,
              amount: quote?.total_amount || 0,
              currency: quote?.currency || 'GHS',
              callbackUrl: `${window.location.origin}/customer/payment-callback`
            }
          }
        );

        if (paymentError) throw paymentError;

        sessionStorage.setItem('pending_payment_reference', paymentData.reference);
        sessionStorage.setItem('pending_order_id', createdOrderId);

        window.location.href = paymentData.authorizationUrl;
      } else {
        setCurrentStep('payment-instructions');
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      toast({
        title: 'Payment Error',
        description: error.message || 'Failed to initialize payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAddressId) {
      toast({
        title: 'Error',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }

    // Validate quote ID exists
    if (!quote?.id) {
      console.error('Invalid quote data - missing ID:', quote);
      toast({
        title: 'Error',
        description: 'Invalid quote data. Please close this dialog and try again.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Accept the quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote?.id || '');

      if (quoteError) throw quoteError;

      // The auto_convert_quote_to_order trigger will create the order
      // Wait for it to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Find the created order
      const { data: orders, error: orderFetchError } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('quote_id', quote?.id || '')
        .single();

      if (orderFetchError) throw orderFetchError;

      // Update the order with delivery address
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          delivery_address_id: selectedAddressId,
          delivery_address_confirmed_at: new Date().toISOString(),
        })
        .eq('id', orders.id);

      if (orderUpdateError) throw orderUpdateError;

      // Send payment instructions email (non-blocking)
      try {
        await supabase.functions.invoke('send-payment-instructions', {
          body: {
            quoteId: quote?.id || '',
            customerEmail: profile?.email,
            customerName: addresses.find(a => a.id === selectedAddressId)?.receiver_name,
            orderNumber: orders.order_number
          }
        });
      } catch (emailError) {
        console.error('Payment email error (non-blocking):', emailError);
      }

      toast({
        title: 'Quote Accepted Successfully!',
        description: 'Your order has been created. You can upload payment proof from your Orders page.',
      });

      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        resetForm();
      }, 1500);

    } catch (error: any) {
      console.error('Error accepting quote:', error);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('address');
    setSelectedAddressId('');
  };

  const handleAddNewAddress = () => {
    onOpenChange(false);
    toast({
      title: 'Add New Address',
      description: 'Please go to your addresses page to add a new delivery address',
    });
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Accept Quote & Complete Order</DialogTitle>
          <DialogDescription>
            Quote {quote?.quote_number || 'N/A'} • {quote?.currency || 'GHS'} {quote?.total_amount?.toLocaleString() || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-2 ${currentStep === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'address' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              1
            </div>
            <span className="text-sm font-medium">Delivery Address</span>
          </div>
          <div className="flex-1 h-px bg-border" />
          <div className={`flex items-center gap-2 ${currentStep !== 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep !== 'address' ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Payment</span>
          </div>
        </div>

        {currentStep === 'address' ? (
          // Address Selection Step
          <div className="space-y-4">
            {loadingAddresses ? (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Loading addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No addresses found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  You need to add a delivery address before accepting this quote
                </p>
                <Button onClick={handleAddNewAddress}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Delivery Address
                </Button>
              </div>
            ) : (
              <>
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-accent ${
                        selectedAddressId === address.id ? 'border-primary bg-accent' : ''
                      }`}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <RadioGroupItem value={address.id} id={address.id} />
                      <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{address.receiver_name}</p>
                            {address.is_default && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{address.phone_number}</p>
                          <div className="flex items-start gap-2 mt-2">
                            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium">Digital Address: {address.ghana_digital_address}</p>
                              <p className="text-muted-foreground">
                                {address.street_address}
                                {address.area && `, ${address.area}`}
                              </p>
                              <p className="text-muted-foreground">
                                {address.city}, {address.region}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button variant="outline" onClick={handleAddNewAddress}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Address
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleProceedToPayment} disabled={!selectedAddressId}>
                      Continue to Payment
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // Payment Step
          <div className="space-y-6">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 mb-1">Quote Accepted Successfully!</h3>
                  <p className="text-sm text-green-800">
                    Your order has been created. Payment instructions have been sent to your email.
                  </p>
                </div>
              </div>
            </div>

            {/* Email Confirmation Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">📧 Payment Instructions Emailed</h4>
                  <p className="text-sm text-blue-800">
                    We've sent detailed payment instructions to <strong>{profile?.email}</strong>. 
                    You can also view them below for your convenience.
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Payment Instructions */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/30 rounded-lg p-5 space-y-5">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Payment Instructions</h3>
              </div>

              {/* Payment Reference - Prominent */}
              <div className="bg-primary/10 border-2 border-primary/40 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <p className="text-sm font-semibold text-primary">REQUIRED PAYMENT REFERENCE</p>
                </div>
                <div className="bg-white p-3 rounded border-2 border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Use this reference for your payment:</p>
                  <p className="font-mono text-2xl font-bold text-primary tracking-wide">
                    {quote?.quote_number || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Total Amount to Pay</p>
                <p className="text-3xl font-bold">
                  {quote?.total_amount?.toLocaleString() || 'N/A'} {quote?.currency || 'GHS'}
                </p>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                {/* Bank Transfer - Blue theme */}
                <div className="border-2 border-blue-200 rounded-lg bg-blue-50/50 p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-900 text-lg">
                    <Building2 className="h-5 w-5" />
                    Option 1: Bank Transfer
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">Bank Name</p>
                      <p className="font-semibold text-blue-900">Ecobank Ghana</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">Account Name</p>
                      <p className="font-semibold text-blue-900 text-xs">Trust Link Ventures Limited</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">Account Number (GHS)</p>
                      <p className="font-mono text-lg font-bold text-blue-900">1641001593405</p>
                    </div>
                    <div className="bg-white p-2 rounded border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">Swift Code</p>
                      <p className="font-mono font-semibold text-blue-900">ECOCGHAC</p>
                    </div>
                  </div>
                </div>

                {/* Mobile Money - Green theme */}
                <div className="border-2 border-green-200 rounded-lg bg-green-50/50 p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-900 text-lg">
                    <Smartphone className="h-5 w-5" />
                    Option 2: Mobile Money
                  </h4>
                  <p className="text-sm text-green-800 mb-3">
                    <strong>Account Name:</strong> Trust Link Ventures Limited
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-white p-3 rounded border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center text-xs font-bold">M</div>
                        <p className="text-xs text-green-700 font-medium">MTN MoMo</p>
                      </div>
                      <p className="font-mono text-base font-bold text-green-900">0244690607</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-xs font-bold text-white">V</div>
                        <p className="text-xs text-green-700 font-medium">Vodafone Cash</p>
                      </div>
                      <p className="font-mono text-base font-bold text-green-900">0506690607</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-green-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">A</div>
                        <p className="text-xs text-green-700 font-medium">AirtelTigo</p>
                      </div>
                      <p className="font-mono text-base font-bold text-green-900">0276690607</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-semibold mb-2 text-amber-900">⚠️ Important Payment Notes:</p>
                <ul className="text-sm space-y-1 text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>Payment must be completed within <strong>7 days</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>Upload proof of payment from your Orders page after completing transaction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>Processing begins after payment verification (24-48 hours)</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Next Steps Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Next Steps</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Complete Payment</p>
                    <p className="text-sm text-blue-800">Use the payment details above to send your payment within 7 days</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Upload Payment Proof</p>
                    <p className="text-sm text-blue-800">After payment, go to <strong>My Orders</strong> page and click <strong>"Upload Payment Proof"</strong></p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900">Order Processing</p>
                    <p className="text-sm text-blue-800">We'll verify your payment (24-48 hours) and start processing your order</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={() => setCurrentStep('address')} disabled={submitting}>
                Back to Address
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Accept Quote & Create Order
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
