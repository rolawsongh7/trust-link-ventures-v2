import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface AddressBannerProps {
  onAddAddressClick: () => void;
}

export const AddressBanner: React.FC<AddressBannerProps> = ({ onAddAddressClick }) => {
  const { profile } = useCustomerAuth();
  const [hasAddress, setHasAddress] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkForAddress();
    
    // Set up real-time listener for address changes
    const channel = supabase
      .channel('address-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_addresses',
          filter: `customer_id=eq.${profile?.id}`
        },
        () => {
          checkForAddress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const checkForAddress = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('customer_id', profile.id)
      .limit(1);

    if (!error) {
      setHasAddress((data?.length || 0) > 0);
    }
  };

  // Don't show banner if:
  // 1. Still checking for address
  // 2. User has an address
  // 3. User dismissed it this session
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
