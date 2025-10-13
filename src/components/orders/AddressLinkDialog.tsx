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
import { MapPin, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    if (open && customerId) {
      fetchAddresses();
    }
  }, [open, customerId]);

  const fetchAddresses = async () => {
    console.log('🔍 [AddressLinkDialog] Starting fetchAddresses...');
    console.log('📋 Props:', { orderId, orderNumber, customerId });
    
    const timeout = setTimeout(() => {
      console.error('⏰ Timeout: fetchAddresses took longer than 10 seconds');
      toast({
        title: 'Request Timeout',
        description: 'Loading addresses is taking too long. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }, 10000);
    
    try {
      // Check auth state first
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Auth session:', session ? 'Valid' : 'Missing');
      console.log('👤 User ID:', session?.user?.id);
      
      console.log('📞 Invoking get-customer-addresses function...');
      console.log('📤 Request body:', { customerId });
      
      const { data, error } = await supabase.functions.invoke('get-customer-addresses', {
        body: { customerId },
      });

      console.log('📥 Response received:', { data, error });

      if (error) {
        console.error('❌ Function invocation error:', error);
        console.warn('⚠️ Edge function failed, trying direct query as fallback...');
        
        // Fallback to direct query
        const { data: directData, error: directError } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', customerId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (directError) {
          console.error('❌ Fallback query also failed:', directError);
          throw directError;
        }
        
        console.log('✅ Fallback query successful, addresses:', directData?.length || 0);
        setAddresses(directData || []);
        clearTimeout(timeout);
        return;
      }
      
      if (data?.error) {
        console.error('❌ Server-side error:', data.error);
        throw new Error(data.error);
      }
      
      console.log('✅ Addresses fetched:', data?.addresses?.length || 0);
      setAddresses(data?.addresses || []);
      
    } catch (error: any) {
      console.error('💥 Fatal error in fetchAddresses:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        details: error
      });
      
      toast({
        title: 'Error Loading Addresses',
        description: error.message || 'Failed to load customer addresses. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      clearTimeout(timeout);
      console.log('🏁 fetchAddresses complete, setting loading = false');
      setLoading(false);
    }
  };

  const handleLinkAddress = async (addressId: string) => {
    setLinking(true);
    try {
      // Update order with delivery address
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          delivery_address_id: addressId,
          delivery_address_confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Get customer email for confirmation
      const { data: customerData } = await supabase
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .single();

      // Send confirmation emails
      if (customerData?.email) {
        await supabase.functions.invoke('confirm-delivery-address', {
          body: {
            orderId,
            orderNumber,
            addressId,
            customerEmail: customerData.email,
          },
        });
      }

      toast({
        title: 'Success',
        description: `Address linked to order ${orderNumber}. Confirmation emails sent.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link address',
        variant: 'destructive',
      });
    } finally {
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
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No addresses found for this customer.</p>
            <p className="text-sm mt-2">Customer needs to add an address first.</p>
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Link
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
