import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, MapPin, Building2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';

interface ProfileStepProps {
  onNext: () => void;
  onBack: () => void;
}

const COUNTRIES = [
  'Ghana', 'Nigeria', 'Kenya', 'South Africa', 'Ivory Coast', 'Senegal',
  'Tanzania', 'Uganda', 'Cameroon', 'Togo', 'Benin', 'Burkina Faso',
  'Mali', 'Niger', 'Liberia', 'Sierra Leone', 'Guinea', 'Gambia',
  'Other African Country', 'United Kingdom', 'United States', 'Other'
];

const INDUSTRIES = [
  'Food & Beverage', 'Restaurant & Hospitality', 'Retail', 'Food Processing',
  'Import/Export', 'Distribution', 'Catering', 'Grocery Stores', 'Supermarkets',
  'Food Service', 'Manufacturing', 'Bakery', 'Confectionery', 'Other'
];

export const ProfileStep: React.FC<ProfileStepProps> = ({ onNext, onBack }) => {
  const { profile, updateProfile } = useCustomerAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: profile?.phone || '',
    country: profile?.country || '',
    industry: profile?.industry || '',
  });

  // Sync form data when profile updates
  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        country: profile.country || '',
        industry: profile.industry || '',
      });
    }
  }, [profile]);

  const isValid = formData.phone && formData.country && formData.industry;

  const handleSubmit = async () => {
    if (!isValid) return;
    
    setSaving(true);
    try {
      const { error } = await updateProfile(formData);
      if (error) throw error;
      
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved.',
      });
      onNext();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
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
      className="px-4 py-3"
    >
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-foreground mb-1">Complete Your Profile</h2>
        <p className="text-xs text-muted-foreground">
          Help us serve you better
        </p>
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+233 XX XXX XXXX"
            className="bg-background"
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Country
          </Label>
          <Select
            value={formData.country}
            onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select your country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Industry
          </Label>
          <Select
            value={formData.industry}
            onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(industry => (
                <SelectItem key={industry} value={industry}>{industry}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-5 max-w-sm mx-auto">
        <Button variant="outline" onClick={onBack} className="flex-1" size="sm">
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!isValid || saving}
          className="flex-1 bg-tl-gradient hover:opacity-90 text-white"
          size="sm"
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
