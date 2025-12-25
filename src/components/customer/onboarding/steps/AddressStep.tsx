import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Phone, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';

interface AddressStepProps {
  onNext: () => void;
  onBack: () => void;
  onAddressAdded: () => void;
}

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo', 'Western North',
  'Ahafo', 'Bono East', 'Oti', 'Savannah', 'North East'
];

export const AddressStep: React.FC<AddressStepProps> = ({ onNext, onBack, onAddressAdded }) => {
  const { profile } = useCustomerAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    receiver_name: profile?.full_name || '',
    phone_number: profile?.phone || '',
    ghana_digital_address: '',
    region: 'Greater Accra',
    city: '',
    street_address: '',
    additional_directions: '',
  });

  const isValid = 
    formData.receiver_name && 
    formData.phone_number && 
    formData.ghana_digital_address.match(/^[A-Z]{2}-\d{3,4}-\d{4}$/) &&
    formData.region && 
    formData.city && 
    formData.street_address;

  const handleSubmit = async () => {
    if (!isValid || !profile?.id) return;
    
    setSaving(true);
    try {
      // Get customer_id from mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;

      // Delete any placeholder addresses first
      await supabase
        .from('customer_addresses')
        .delete()
        .eq('customer_id', customerId)
        .or('phone_number.eq.+233000000000,ghana_digital_address.eq.GA-000-0000');

      // Insert new address
      const { error } = await supabase
        .from('customer_addresses')
        .insert([{
          customer_id: customerId,
          receiver_name: formData.receiver_name,
          phone_number: formData.phone_number,
          ghana_digital_address: formData.ghana_digital_address.toUpperCase(),
          region: formData.region,
          city: formData.city,
          street_address: formData.street_address,
          additional_directions: formData.additional_directions,
          is_default: true,
        }]);

      if (error) throw error;

      toast({
        title: 'Address Added',
        description: 'Your delivery address has been saved.',
      });
      
      onAddressAdded();
      onNext();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error?.message || 'Failed to save address. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="px-4 py-6"
    >
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Add Delivery Address</h2>
        <p className="text-sm text-muted-foreground">
          Where should we deliver your orders?
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {/* Receiver Name */}
        <div className="space-y-2">
          <Label htmlFor="receiver_name" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Receiver Name
          </Label>
          <Input
            id="receiver_name"
            value={formData.receiver_name}
            onChange={(e) => setFormData(prev => ({ ...prev, receiver_name: e.target.value }))}
            placeholder="Full name"
            className="bg-background"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone_number}
            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
            placeholder="+233 XX XXX XXXX"
            className="bg-background"
          />
        </div>

        {/* Ghana Digital Address */}
        <div className="space-y-2">
          <Label htmlFor="gps" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Ghana Digital Address
          </Label>
          <Input
            id="gps"
            value={formData.ghana_digital_address}
            onChange={(e) => setFormData(prev => ({ ...prev, ghana_digital_address: e.target.value.toUpperCase() }))}
            placeholder="GA-123-4567"
            className="bg-background uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Format: AA-000-0000 (e.g., GA-123-4567)
          </p>
        </div>

        {/* Region & City */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Region</Label>
            <Select
              value={formData.region}
              onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GHANA_REGIONS.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              placeholder="City"
              className="bg-background"
            />
          </div>
        </div>

        {/* Street Address */}
        <div className="space-y-2">
          <Label htmlFor="street">Street Address</Label>
          <Textarea
            id="street"
            value={formData.street_address}
            onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
            placeholder="Street name, building number, landmarks..."
            className="bg-background resize-none"
            rows={2}
          />
        </div>

        {/* Additional Directions (optional) */}
        <div className="space-y-2">
          <Label htmlFor="directions" className="text-muted-foreground">
            Additional Directions (optional)
          </Label>
          <Input
            id="directions"
            value={formData.additional_directions}
            onChange={(e) => setFormData(prev => ({ ...prev, additional_directions: e.target.value }))}
            placeholder="Near the blue gate, opposite..."
            className="bg-background"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-8 max-w-sm mx-auto">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="flex-1 bg-tl-gradient hover:opacity-90 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </motion.div>
  );
};
