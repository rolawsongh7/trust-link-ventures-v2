import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, Building2, Mail, Phone, MapPin, Save, Shield, Lock } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { CustomerMFASetup } from './CustomerMFASetup';


export const CustomerProfile: React.FC = () => {
  const { profile, updateProfile, signOut } = useCustomerAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    industry: profile?.industry || ''
  });

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { error } = await updateProfile(formData);
      
      if (error) {
        throw error;
      }
      
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      company_name: profile?.company_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      country: profile?.country || '',
      industry: profile?.industry || ''
    });
    setIsEditing(false);
  };

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria', 'Bangladesh', 
    'Belgium', 'Brazil', 'Canada', 'China', 'Denmark', 'Egypt', 'France', 'Germany', 
    'Ghana', 'India', 'Indonesia', 'Italy', 'Japan', 'Kenya', 'Malaysia', 'Mexico', 
    'Netherlands', 'Nigeria', 'Norway', 'Pakistan', 'Philippines', 'Poland', 'Russia', 
    'Saudi Arabia', 'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 
    'Switzerland', 'Thailand', 'Turkey', 'Ukraine', 'United Kingdom', 'United States', 
    'Vietnam'
  ];

  const industries = [
    'Food & Beverage', 'Restaurant & Hospitality', 'Retail', 'Food Processing', 
    'Import/Export', 'Distribution', 'Catering', 'Grocery Stores', 'Supermarkets',
    'Food Service', 'Manufacturing', 'Other'
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Gradient Header */}
      <div className="relative overflow-hidden rounded-2xl bg-tl-gradient p-8 sm:p-10 shadow-xl">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <User className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Profile Settings
            </h1>
          </div>
          <p className="text-white/90 text-base max-w-2xl">
            Manage your account information and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card className="bg-tl-surface/80 backdrop-blur-md border-tl-border shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-tl-border/50">
              <CardTitle className="flex items-center gap-2 text-tl-text">
                <User className="h-5 w-5 text-tl-primary" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-tl-text">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 bg-tl-bg border-tl-border text-tl-text"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-tl-text">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 bg-tl-bg border-tl-border text-tl-text"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-tl-text">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-tl-muted/20 border-tl-border text-tl-muted"
                  />
                </div>
                <p className="text-xs text-tl-muted">
                  Email address cannot be changed. Contact support if you need to update this.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-tl-text">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-tl-muted" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10 bg-tl-bg border-tl-border text-tl-text"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-tl-text">Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-tl-muted z-10" />
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="pl-10 bg-tl-bg border-tl-border text-tl-text">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent className="bg-tl-surface border-tl-border">
                        {countries.map(country => (
                          <SelectItem key={country} value={country} className="text-tl-text">
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry" className="text-tl-text">Industry</Label>
                <Select 
                  value={formData.industry} 
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger className="bg-tl-bg border-tl-border text-tl-text">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-tl-surface border-tl-border">
                    {industries.map(industry => (
                      <SelectItem key={industry} value={industry} className="text-tl-text">
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-tl-border to-transparent" />

              <div className="flex flex-wrap items-center gap-3">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-tl-gradient hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      className="border-tl-border text-tl-text hover:bg-tl-muted/20"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => setIsEditing(true)}
                    className="bg-tl-gradient hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          <Card className="bg-tl-surface/80 backdrop-blur-md border-tl-border shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-tl-border/50">
              <CardTitle className="flex items-center gap-2 text-tl-text">
                <Shield className="h-5 w-5 text-tl-primary" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Button 
                variant="outline" 
                className="w-full justify-start border-tl-border text-tl-text hover:bg-tl-muted/20"
                onClick={() => setShowChangePassword(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start border-tl-border text-tl-text hover:bg-tl-muted/20"
                onClick={() => setShowMFASetup(true)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Two-Factor Authentication
              </Button>
              
              <div className="h-px bg-gradient-to-r from-transparent via-tl-border to-transparent" />
              
              <Button 
                variant="destructive" 
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md hover:shadow-lg transition-all"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-tl-surface/80 backdrop-blur-md border-tl-border shadow-lg">
            <CardHeader className="border-b border-tl-border/50">
              <CardTitle className="text-base text-tl-text">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pt-6">
              <div className="flex justify-between items-center">
                <span className="font-medium text-tl-muted">Account Type:</span>
                <span className="text-tl-text">Customer</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-tl-muted">Member Since:</span>
                <span className="text-tl-text">January 2024</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-tl-muted">Total Orders:</span>
                <span className="text-tl-text">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-tl-muted">Total Quotes:</span>
                <span className="text-tl-text">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword}
      />

      <CustomerMFASetup
        open={showMFASetup}
        onOpenChange={setShowMFASetup}
      />
    </div>
  );
};