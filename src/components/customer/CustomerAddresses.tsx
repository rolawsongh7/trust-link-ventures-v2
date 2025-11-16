import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, MapPin, Edit2, Trash2, Check, AlertCircle, Star, CheckCircle } from 'lucide-react';
import { PortalPageHeader } from './PortalPageHeader';

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Western North',
  'Ahafo', 'Bono East', 'Oti', 'Savannah', 'North East'
];

const addressSchema = z.object({
  receiver_name: z.string().min(2, 'Receiver name must be at least 2 characters'),
  phone_number: z.string().regex(/^(\+?233|0)[0-9]{9}$/, 'Please enter a valid Ghana phone number'),
  ghana_digital_address: z.string().regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, 'Please enter a valid Ghana Digital Address (e.g., GA-123-4567)'),
  region: z.string().min(1, 'Please select a region'),
  city: z.string().min(2, 'City is required'),
  area: z.string().optional(),
  street_address: z.string().min(5, 'Street address is required'),
  additional_directions: z.string().optional(),
  is_default: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Address extends AddressFormData {
  id: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export const CustomerAddresses = () => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isMobile } = useMobileDetection();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      receiver_name: '',
      phone_number: '',
      ghana_digital_address: '',
      region: '',
      city: '',
      area: '',
      street_address: '',
      additional_directions: '',
      is_default: false,
    },
  });

  useEffect(() => {
    if (profile) {
      fetchAddresses();
    }
    
    // Check for orderId query parameter
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('orderId');
    const orderNumberParam = params.get('orderNumber');
    
    if (orderIdParam) {
      setPendingOrderId(orderIdParam);
      if (orderNumberParam) {
        setPendingOrderNumber(decodeURIComponent(orderNumberParam));
      }
    }
  }, [profile]);

  const fetchAddresses = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', profile.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast({
        title: 'Error Loading Addresses',
        description: error?.message || 'Failed to load addresses. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const linkAddressToOrder = async (addressId: string, orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          delivery_address_id: addressId,
          delivery_address_confirmed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send confirmation emails
      try {
        await supabase.functions.invoke('confirm-delivery-address', {
          body: {
            orderId,
            orderNumber: pendingOrderNumber,
            addressId,
            customerEmail: profile?.email,
          }
        });
      } catch (emailError) {
        console.warn('Failed to send confirmation emails:', emailError);
      }

      toast({
        title: 'Address Linked!',
        description: `Address successfully linked to order ${pendingOrderNumber || orderId}`,
      });

      // Clear pending order state and redirect
      setPendingOrderId(null);
      setPendingOrderNumber(null);
      
      setTimeout(() => {
        navigate(`/portal/orders?highlight=${orderId}`);
      }, 1500);
    } catch (error: any) {
      console.error('Error linking address to order:', error);
      
      // Log detailed error information for debugging
      if (error?.code) {
        console.error('Supabase error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
      }
      
      const errorMessage = error?.message || 'Unknown error occurred';
      const isRLSError = errorMessage.includes('row-level security') || errorMessage.includes('policy');
      
      toast({
        title: isRLSError ? 'Permission Error' : 'Warning',
        description: isRLSError 
          ? 'Unable to link address. Please contact support if this persists.'
          : 'Address saved but failed to link to order. Please select it manually.',
        variant: isRLSError ? 'destructive' : 'default',
      });
    }
  };

  const onSubmit = async (data: AddressFormData) => {
    if (!profile) return;

    try {
      let addressId: string;
      
      if (editingAddress) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(data)
          .eq('id', editingAddress.id);

        if (error) throw error;
        addressId = editingAddress.id;
        toast({ title: 'Success', description: 'Address updated successfully' });
      } else {
        const { data: newAddress, error } = await supabase
          .from('customer_addresses')
          .insert([{
            customer_id: profile.id,
            receiver_name: data.receiver_name,
            phone_number: data.phone_number,
            ghana_digital_address: data.ghana_digital_address,
            region: data.region,
            city: data.city,
            street_address: data.street_address,
            area: data.area,
            additional_directions: data.additional_directions,
            is_default: data.is_default,
          }])
          .select()
          .single();

        if (error) throw error;
        addressId = newAddress.id;
        toast({ title: 'Success', description: 'Address added successfully' });
      }

      // If there's a pending order from URL params, link this address to it
      if (pendingOrderId && addressId) {
        await linkAddressToOrder(addressId, pendingOrderId);
      } else if (!editingAddress && addressId) {
        // Smart auto-linking: Check if customer has a single pending order that needs an address
        const { data: pendingOrders } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('customer_id', profile.id)
          .not('delivery_address_requested_at', 'is', null)
          .is('delivery_address_id', null)
          .order('delivery_address_requested_at', { ascending: false })
          .limit(1);

        if (pendingOrders && pendingOrders.length === 1) {
          const order = pendingOrders[0];
          toast({
            title: 'Auto-linking address...',
            description: `Found pending order ${order.order_number} that needs an address`,
          });
          await linkAddressToOrder(addressId, order.id);
        }
      }

      setDialogOpen(false);
      form.reset();
      setEditingAddress(null);
      fetchAddresses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save address',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    form.reset(address);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Address deleted successfully' });
      fetchAddresses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete address',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Default address updated' });
      fetchAddresses();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update default address',
        variant: 'destructive',
      });
    }
  };

  // Show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <Card className="overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                <div className="h-8 bg-muted/50 rounded-lg animate-pulse w-48" />
                <div className="h-4 bg-muted/30 rounded animate-pulse w-64" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-muted/50 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
                <div className="h-4 bg-muted/30 rounded animate-pulse w-5/6" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-muted/50 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-muted/30 rounded animate-pulse w-full" />
                <div className="h-4 bg-muted/30 rounded animate-pulse w-5/6" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show message if profile is not available
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Profile Not Available</h3>
                <p className="text-muted-foreground">
                  Please log in to view and manage your delivery addresses.
                </p>
              </div>
              <Button onClick={() => navigate('/portal-auth')}>
                Go to Login
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Gradient Header */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="Delivery Addresses"
          subtitle="Manage your delivery addresses"
          totalCount={addresses.length}
          totalIcon={MapPin}
          patternId="addresses-grid"
          stats={[
            {
              label: "Default",
              count: addresses.filter(a => a.is_default).length,
              icon: Star
            },
            {
              label: "Active",
              count: addresses.length,
              icon: CheckCircle
            },
            {
              label: "Complete",
              count: addresses.filter(a => a.ghana_digital_address && a.city && a.region).length,
              icon: MapPin
            }
          ]}
        />
      </Card>

      {/* Add Address Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingAddress(null);
          }
        }}
      >
        {/* Desktop Button */}
        {!isMobile && (
          <div className="flex justify-end mb-4">
            <DialogTrigger asChild>
              <Button className="bg-white/20 border border-white/30 text-white hover:bg-white/10 h-11 sm:h-10 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </DialogTrigger>
          </div>
        )}
        
        <DialogContent className="bg-tl-surface max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl text-tl-primary">
              {editingAddress ? 'Edit' : 'Add'} Delivery Address
            </DialogTitle>
            <DialogDescription className="text-tl-muted">
              Enter the delivery address details. Ghana Digital Address is required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="receiver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-primary">Receiver Name *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="John Doe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-primary">Phone Number *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="+233XXXXXXXXX or 0XXXXXXXXX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ghana_digital_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tl-primary">Ghana Digital Address *</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="GA-123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-primary">Region *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GHANA_REGIONS.map((region) => (
                            <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-primary">City *</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="Accra" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tl-primary">Area/Neighborhood</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="Osu" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tl-primary">Street Address *</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white/5 border-white/10 text-white h-11 sm:h-10 touch-manipulation" placeholder="123 Main Street" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additional_directions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-tl-primary">Additional Directions</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="bg-white/5 border-white/10 text-white min-h-[80px] touch-manipulation" 
                        placeholder="Near blue house with gate"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 sm:p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-tl-primary">
                        Set as Default Address
                      </FormLabel>
                      <FormLabel className="text-sm text-tl-muted">
                        This address will be used by default for orders
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    form.reset();
                    setEditingAddress(null);
                  }}
                  className="border-white/10 text-white hover:bg-white/10 h-11 sm:h-10 touch-manipulation"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-tl-gradient text-white hover:opacity-95 h-11 sm:h-10 touch-manipulation"
                >
                  {editingAddress ? 'Update' : 'Add'} Address
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Pending Order Banner */}
      {pendingOrderId && pendingOrderNumber && (
        <Card className="border-[#2196F3]/30 border-l-4 border-l-maritime-400 bg-[#E3F2FD]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[#2196F3] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-[#0D47A1]">
                  Delivery Address Needed for Order {pendingOrderNumber}
                </h3>
                <p className="text-sm text-[#1565C0] mt-1">
                  Add a new address or select an existing one below. It will be automatically linked to your
                  order.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {addresses.length === 0 ? (
        <Card className="text-center py-12 bg-tl-surface border border-tl-border rounded-lg shadow-sm">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tl-accent/10 flex items-center justify-center">
              <MapPin className="h-10 w-10 text-tl-accent" />
            </div>
            <h3 className="text-xl font-semibold text-tl-primary mb-2">No addresses yet</h3>
            <p className="text-tl-muted mb-6">Add a delivery address to complete your orders</p>
            <Button
              className="bg-tl-gradient text-white hover:opacity-95"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className="bg-tl-surface border border-tl-border border-l-4 border-l-maritime-400 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base text-tl-primary flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-tl-accent" />
                      {address.receiver_name}
                      {address.is_default && (
                        <span className="text-xs bg-[#E3F2FD] text-tl-accent border border-tl-accent/20 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Address details */}
                <div className="text-sm text-tl-text space-y-1">
                  <p className="font-medium">{address.street_address}</p>
                  <p>
                    {address.area && `${address.area}, `}
                    {address.city}
                  </p>
                  <p>{address.region}</p>
                  <p className="text-tl-muted">{address.ghana_digital_address}</p>
                  <p className="text-tl-muted">{address.phone_number}</p>
                  {address.additional_directions && (
                    <p className="text-tl-muted italic mt-2">{address.additional_directions}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-3 border-t border-tl-border">
                  {!address.is_default && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-tl-border hover:bg-tl-bg"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-tl-border hover:bg-tl-bg"
                    onClick={() => handleEdit(address)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-[#C62828]/30 text-[#C62828] hover:bg-[#FFEBEE]"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Link to order if pending */}
                {pendingOrderId && (
                  <Button
                    className="w-full bg-tl-gradient text-white hover:opacity-95"
                    onClick={() => linkAddressToOrder(address.id, pendingOrderId)}
                  >
                    Use for Order {pendingOrderNumber}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Mobile FAB */}
      {isMobile && (
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 z-40"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      )}
    </div>
  );
}