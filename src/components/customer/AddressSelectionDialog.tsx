import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { MapPin, Plus } from 'lucide-react';
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

interface AddressSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (addressId: string) => void;
  title?: string;
  description?: string;
}

export default function AddressSelectionDialog({
  open,
  onOpenChange,
  onSelect,
  title = "Select Delivery Address",
  description = "Choose the delivery address for this order"
}: AddressSelectionDialogProps) {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
      
      // Auto-select default address
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
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedAddressId) {
      toast({
        title: 'No Address Selected',
        description: 'Please select a delivery address',
        variant: 'destructive',
      });
      return;
    }
    onSelect(selectedAddressId);
  };

  const handleAddNew = () => {
    // Close dialog and navigate to addresses page
    onOpenChange(false);
    // You can add navigation logic here if needed
    toast({
      title: 'Add New Address',
      description: 'Please go to your addresses page to add a new delivery address',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">{description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-6 sm:p-8">
            <p className="text-sm sm:text-base text-muted-foreground">Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 sm:p-8">
            <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No addresses found</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              You need to add a delivery address before you can proceed
            </p>
            <Button onClick={handleAddNew} className="h-11 sm:h-10 text-base sm:text-sm touch-manipulation">
              <Plus className="w-4 h-4 mr-2" />
              Add Delivery Address
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
                          {address.additional_directions && (
                            <p className="text-muted-foreground mt-1">
                              Directions: {address.additional_directions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Address
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={!selectedAddressId}>
                  Confirm Address
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}