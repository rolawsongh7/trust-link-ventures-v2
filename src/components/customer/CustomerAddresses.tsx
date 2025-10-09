import { useState, useEffect } from 'react';
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
import { Plus, MapPin, Edit2, Trash2, Check } from 'lucide-react';

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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

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

  const onSubmit = async (data: AddressFormData) => {
    if (!profile) return;

    try {
      if (editingAddress) {
        const { error } = await supabase
          .from('customer_addresses')
          .update(data)
          .eq('id', editingAddress.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Address updated successfully' });
      } else {
        const { error } = await supabase
          .from('customer_addresses')
          .insert([{ 
            customer_id: profile.id,
            receiver_name: data.receiver_name,
            phone_number: data.phone_number,
            ghana_digital_address: data.ghana_digital_address,
            region: data.region,
            city: data.city,
            area: data.area,
            street_address: data.street_address,
            additional_directions: data.additional_directions,
            is_default: data.is_default
          }]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Address added successfully' });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold truncate">Delivery Addresses</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your delivery addresses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingAddress(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 sm:h-10 w-full sm:w-auto touch-manipulation">
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Address</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{editingAddress ? 'Edit' : 'Add'} Delivery Address</DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
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
                      <FormLabel className="text-sm sm:text-base">Receiver Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+233244123456 or 0244123456" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Ghana Digital Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="GA-123-4567" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                        <FormLabel className="text-sm sm:text-base">Region *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
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
                        <FormLabel className="text-sm sm:text-base">City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Accra" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Area/Neighborhood</FormLabel>
                      <FormControl>
                        <Input placeholder="Osu" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, House Number" className="h-11 sm:h-10 text-base sm:text-sm" {...field} />
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
                      <FormLabel className="text-sm sm:text-base">Additional Directions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Landmark, special instructions, etc." 
                          className="min-h-20 sm:min-h-16 text-base sm:text-sm resize-none"
                          {...field} 
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
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 sm:p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm sm:text-base">Set as default address</FormLabel>
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

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                    className="h-11 sm:h-10 w-full sm:w-auto text-base sm:text-sm touch-manipulation"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="h-11 sm:h-10 w-full sm:w-auto text-base sm:text-sm touch-manipulation"
                  >
                    {editingAddress ? 'Update' : 'Add'} Address
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 sm:p-12">
            <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No addresses yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground text-center mb-4">
              Add your first delivery address to start requesting quotes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? 'border-primary' : ''}>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                      <span className="truncate">{address.receiver_name}</span>
                      {address.is_default && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded flex-shrink-0">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-1">{address.phone_number}</CardDescription>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                        title="Set as default"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(address)}
                      className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                      title="Edit address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                      title="Delete address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4 sm:p-6 pt-0">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base break-words">Ghana Digital Address: {address.ghana_digital_address}</p>
                    <p className="text-sm text-muted-foreground break-words">
                      {address.street_address}
                      {address.area && `, ${address.area}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.region}
                    </p>
                    {address.additional_directions && (
                      <p className="text-sm text-muted-foreground mt-2 break-words">
                        Directions: {address.additional_directions}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}