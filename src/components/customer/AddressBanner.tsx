import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, X, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { formatDistanceToNow } from 'date-fns';

interface AddressBannerProps {
  onAddAddressClick: () => void;
}

interface PendingOrder {
  id: string;
  order_number: string;
  delivery_address_requested_at: string;
}

export const AddressBanner: React.FC<AddressBannerProps> = ({ onAddAddressClick }) => {
  const { profile } = useCustomerAuth();
  const [hasAddress, setHasAddress] = useState<boolean | null>(null);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkForAddressAndPendingOrders();
    
    // Set up real-time listener for address and order changes
    const addressChannel = supabase
      .channel('address-banner-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_addresses',
          filter: `customer_id=eq.${profile?.id}`
        },
        () => {
          checkForAddressAndPendingOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          checkForAddressAndPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(addressChannel);
    };
  }, [profile?.id, profile?.email]);

  const checkForAddressAndPendingOrders = async () => {
    if (!profile?.id || !profile?.email) return;

    try {
      // Check for existing addresses
      const { data: addressData } = await supabase
        .from('customer_addresses')
        .select('id')
        .eq('customer_id', profile.id)
        .limit(1);

      setHasAddress((addressData?.length || 0) > 0);

      // Get customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!customer) return;

      // Check for orders with pending address requests
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, order_number, delivery_address_requested_at')
        .eq('customer_id', customer.id)
        .is('delivery_address_id', null)
        .not('delivery_address_requested_at', 'is', null)
        .order('delivery_address_requested_at', { ascending: false });

      setPendingOrders(ordersData || []);
    } catch (error) {
      console.error('Error checking address status:', error);
    }
  };

  // Show banner if there are pending address requests
  if (pendingOrders.length > 0 && !isDismissed) {
    const mostRecentRequest = pendingOrders[0];
    
    return (
      <Alert className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-300 relative mb-6 animate-pulse-slow">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pr-8">
          <div className="flex-1">
            <p className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Urgent: Delivery Address Required
            </p>
            <p className="text-sm text-orange-800 mb-2">
              {pendingOrders.length === 1 
                ? `Order ${mostRecentRequest.order_number} is waiting for your delivery address.` 
                : `${pendingOrders.length} orders are waiting for your delivery address.`}
              {' '}Requested {formatDistanceToNow(new Date(mostRecentRequest.delivery_address_requested_at), { addSuffix: true })}.
            </p>
            {pendingOrders.length > 1 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {pendingOrders.slice(0, 3).map((order) => (
                  <Badge key={order.id} variant="outline" className="bg-white/50">
                    {order.order_number}
                  </Badge>
                ))}
                {pendingOrders.length > 3 && (
                  <Badge variant="outline" className="bg-white/50">
                    +{pendingOrders.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={onAddAddressClick}
            className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap shadow-lg"
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Provide Address Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Fallback: Show generic banner if no addresses and no pending requests
  if (hasAddress === null || hasAddress || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 relative mb-6">
      <AlertCircle className="h-5 w-5 text-amber-600" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pr-8">
        <div className="flex-1">
          <p className="font-semibold text-amber-900 mb-1">
            Complete Your Profile
          </p>
          <p className="text-sm text-amber-800">
            Add your delivery address to ensure smooth order processing and avoid delays. This information will be used for all future orders.
          </p>
        </div>
        <Button
          onClick={onAddAddressClick}
          className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
          size="sm"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Add Address Now
        </Button>
      </AlertDescription>
    </Alert>
  );
};
