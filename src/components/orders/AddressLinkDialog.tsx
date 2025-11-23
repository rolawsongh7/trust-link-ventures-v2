import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Check, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

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

interface AddressLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  customerId: string;
  onSuccess: () => void;
}

export const AddressLinkDialog: React.FC<AddressLinkDialogProps> = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
  customerId,
  onSuccess,
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchAddresses();
    }
  }, [open, customerId]);

  const fetchAddresses = async () => {
    console.log('🔍 [AddressLinkDialog] Starting fetchAddresses...');
    console.log('📋 Props:', { orderId, orderNumber, customerId });
    
    setLoading(true);
    
    const timeout = setTimeout(() => {
      console.error('⏰ Timeout: fetchAddresses took longer than 10 seconds');
      toast.error('Loading addresses is taking too long. Please try again.');
      setLoading(false);
    }, 10000);
    
    try {
      // Direct query with admin RLS policy
      console.log('📞 Fetching addresses directly from database...');
      const { data: directData, error: directError } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      console.log('📥 Query result:', { data: directData, error: directError });
      
      if (directError) {
        console.error('❌ Database query failed:', directError);
        throw directError;
      }
      
      console.log('✅ Addresses fetched:', directData?.length || 0);
      setAddresses(directData || []);
      
    } catch (error: any) {
      console.error('💥 Fatal error in fetchAddresses:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      });
      
      toast.error(error.message || 'Failed to load customer addresses. Please check your permissions.');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const handleLinkAddress = async (addressId: string) => {
    // Prevent multiple simultaneous operations
    if (linking) {
      console.log('⚠️ [AddressLinkDialog] Already linking, ignoring duplicate call');
      return;
    }
    
    console.log('🔗 [AddressLinkDialog] Starting handleLinkAddress...', {
      addressId,
      orderId,
      orderNumber,
      customerId
    });
    
    setLinking(true);
    
    try {
      // Update order with delivery address
      console.log('📝 [AddressLinkDialog] Attempting to update order...');
      const { data: updateData, error: updateError } = await supabase
        .from('orders')
        .update({
          delivery_address_id: addressId,
          delivery_address_confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select();

      console.log('📥 [AddressLinkDialog] Update result:', { 
        updateData, 
        updateError,
        hasData: !!updateData,
        errorCode: updateError?.code,
        errorMessage: updateError?.message,
        errorDetails: updateError?.details
      });

      if (updateError) {
        console.error('❌ [AddressLinkDialog] Update failed:', updateError);
        throw updateError;
      }

      if (!updateData || updateData.length === 0) {
        console.error('⚠️ [AddressLinkDialog] No rows updated');
        throw new Error('Failed to update order - no rows affected. This may be an RLS policy issue.');
      }

      console.log('✅ [AddressLinkDialog] Order updated successfully');

      // Get customer email for confirmation
      console.log('📧 [AddressLinkDialog] Fetching customer email...');
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .single();

      console.log('📥 [AddressLinkDialog] Customer data:', {
        customerData,
        customerError,
        hasEmail: !!customerData?.email
      });

      if (customerError) {
        console.error('❌ [AddressLinkDialog] Failed to fetch customer email:', customerError);
      }

      // Send confirmation emails
      if (customerData?.email) {
        console.log('📬 [AddressLinkDialog] Invoking confirm-delivery-address edge function...');
        const { data: emailData, error: emailError } = await supabase.functions.invoke('confirm-delivery-address', {
          body: {
            orderId,
            orderNumber,
            addressId,
            customerEmail: customerData.email,
          },
        });

        console.log('📥 [AddressLinkDialog] Edge function result:', {
          emailData,
          emailError
        });

        if (emailError) {
          console.error('⚠️ [AddressLinkDialog] Email sending failed (non-fatal):', emailError);
        }
      } else {
        console.warn('⚠️ [AddressLinkDialog] No customer email found, skipping confirmation emails');
      }

      console.log('✅ [AddressLinkDialog] Address linking complete');

      toast.success(`Address linked to order ${orderNumber}${customerData?.email ? '. Confirmation emails sent.' : '.'}`);

      // Close dialog BEFORE calling onSuccess to prevent re-render loop
      onOpenChange(false);
      
      // Small delay to ensure dialog closes before triggering data refresh
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (error: any) {
      console.error('💥 [AddressLinkDialog] Fatal error in handleLinkAddress:', {
        message: error.message,
        name: error.name,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
        fullError: error
      });
      
      toast.error(error.message || 'Failed to link address. Please check console for details.');
    } finally {
      console.log('🏁 [AddressLinkDialog] handleLinkAddress finished');
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Address to Order {orderNumber}</DialogTitle>
          <DialogDescription>
            Select an existing customer address to link to this order
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">No valid addresses found</p>
              <p className="text-sm text-muted-foreground">
                The customer has not provided a complete delivery address yet.
              </p>
              <p className="text-xs text-muted-foreground">
                You can request the delivery address from the customer using the button below.
              </p>
            </div>
            <Button
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get customer details
                  const { data: customerData } = await supabase
                    .from('customers')
                    .select('contact_name, company_name, email')
                    .eq('id', customerId)
                    .single();
                  
                  if (!customerData?.email) {
                    toast.error('Customer email not found');
                    return;
                  }
                  
                  // Call the request-delivery-address edge function
                  const { error: emailError } = await supabase.functions.invoke('request-delivery-address', {
                    body: {
                      orderId,
                      orderNumber,
                      customerEmail: customerData.email,
                      customerName: customerData.contact_name || 'Valued Customer',
                      companyName: customerData.company_name || '',
                    },
                  });
                  
                  if (emailError) {
                    console.error('Failed to send address request:', emailError);
                    toast.error('Failed to send delivery address request');
                  } else {
                    toast.success('Delivery address request sent to customer');
                    onOpenChange(false);
                  }
                } catch (error) {
                  console.error('Error requesting address:', error);
                  toast.error('Failed to send address request');
                } finally {
                  setLoading(false);
                }
              }}
              variant="default"
            >
              <Mail className="mr-2 h-4 w-4" />
              Request Address from Customer
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card key={address.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{address.receiver_name}</span>
                        {address.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{address.phone_number}</p>
                        <p className="font-mono text-xs bg-muted px-2 py-1 rounded inline-block">
                          {address.ghana_digital_address}
                        </p>
                        <p>
                          {address.street_address}
                          {address.area && `, ${address.area}`}
                        </p>
                        <p>
                          {address.city}, {address.region}
                        </p>
                        {address.additional_directions && (
                          <p className="text-xs italic">{address.additional_directions}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleLinkAddress(address.id)}
                      disabled={linking}
                      size="sm"
                      className="shrink-0"
                    >
                      {linking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Linking...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Link Address
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
