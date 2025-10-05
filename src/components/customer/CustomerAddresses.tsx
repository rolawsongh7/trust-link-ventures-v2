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

export default function CustomerAddresses() {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delivery Addresses</h2>
          <p className="text-muted-foreground">Manage your delivery addresses</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            form.reset();
            setEditingAddress(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAddress ? 'Edit' : 'Add'} Delivery Address</DialogTitle>
              <DialogDescription>
                Enter the delivery address details. Ghana Digital Address is required.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="receiver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receiver Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
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
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+233244123456 or 0244123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ghana_digital_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghana Digital Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="GA-123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="region"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Region *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
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
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="Accra" {...field} />
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
                      <FormLabel>Area/Neighborhood</FormLabel>
                      <FormControl>
                        <Input placeholder="Osu" {...field} />
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
                      <FormLabel>Street Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, House Number" {...field} />
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
                      <FormLabel>Additional Directions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Landmark, special instructions, etc." 
                          {...field} 
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
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Set as default address</FormLabel>
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

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
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
          <CardContent className="flex flex-col items-center justify-center p-12">
            <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No addresses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first delivery address to start requesting quotes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {addresses.map((address) => (
            <Card key={address.id} className={address.is_default ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {address.receiver_name}
                      {address.is_default && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>{address.phone_number}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!address.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(address)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium">Ghana Digital Address: {address.ghana_digital_address}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.street_address}
                      {address.area && `, ${address.area}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.region}
                    </p>
                    {address.additional_directions && (
                      <p className="text-sm text-muted-foreground mt-2">
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