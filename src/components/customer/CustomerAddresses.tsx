import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
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
import { Plus, MapPin, Edit2, Trash2, Check, AlertCircle } from 'lucide-react';

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
        navigate(`/customer/orders?highlight=${orderId}`);
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

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading addresses...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      {/* Gradient Header */}
      <div className="bg-tl-gradient text-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Delivery Addresses</h1>
            <p className="text-white/80 text-sm mt-1">Manage your delivery addresses</p>
          </div>
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
            <DialogTrigger asChild>
              <Button className="bg-white/20 border border-white/30 text-white hover:bg-white/10 h-11 sm:h-10 touch-manipulation">
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </Button>
            </DialogTrigger>
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                  <FormField
                    control={form.control}
                    name="receiver_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-tl-text">Receiver Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                            placeholder="John Doe"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-tl-text">Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                            placeholder="+233244123456 or 0244123456"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ghana_digital_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-tl-text">Ghana Digital Address *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                            placeholder="GA-123-4567"
                          />
                        </FormControl>
                        <FormMessage className="text-xs sm:text-sm" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-tl-text">Region *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="border-tl-border focus:border-tl-accent h-11 sm:h-10 text-base sm:text-sm">
                                <SelectValue placeholder="Select region" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60">
                              {GHANA_REGIONS.map((region) => (
                                <SelectItem key={region} value={region} className="h-11 sm:h-10">
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-tl-text">City *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                              placeholder="Accra"
                            />
                          </FormControl>
                          <FormMessage className="text-xs sm:text-sm" />
                        </FormItem>
                      )}
                    />
                  </div>

                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-text">Area/Neighborhood</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                          placeholder="Osu"
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="street_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-text">Street Address *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 h-11 sm:h-10 text-base sm:text-sm"
                          placeholder="123 Main Street, House Number"
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additional_directions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-tl-text">Additional Directions</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="rounded-lg border-tl-border focus:border-tl-accent focus:ring-2 focus:ring-tl-accent/30 min-h-20 sm:min-h-16 text-base sm:text-sm resize-none"
                          placeholder="Landmarks, special instructions, etc."
                        />
                      </FormControl>
                      <FormMessage className="text-xs sm:text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-tl-border p-3 sm:p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-tl-text">Set as default address</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="scale-110 sm:scale-100"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="border-tl-border hover:bg-tl-bg h-11 sm:h-10 w-full sm:w-auto text-base sm:text-sm touch-manipulation"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-tl-gradient text-white hover:opacity-95 h-11 sm:h-10 w-full sm:w-auto text-base sm:text-sm touch-manipulation"
                  >
                    {editingAddress ? 'Update' : 'Add'} Address
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Pending Order Banner */}
      {pendingOrderId && pendingOrderNumber && (
        <Card className="border-[#2196F3]/30 bg-[#E3F2FD]">
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
              className="bg-tl-surface border border-tl-border rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 group"
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
    </div>
  );
}