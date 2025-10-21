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


export const CustomerProfile: React.FC = () => {
  const { profile, updateProfile, signOut } = useCustomerAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
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
    <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email address cannot be changed. Contact support if you need to update this.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isEditing}
                      className="pl-10"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                    <Select 
                      value={formData.country} 
                      onValueChange={(value) => setFormData({ ...formData, country: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  value={formData.industry} 
                  onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map(industry => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <Button 
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-to-r from-primary to-primary/90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setShowChangePassword(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Two-Factor Authentication
              </Button>
              
              <Separator />
              
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Account Type:</span> Customer
              </div>
              <div>
                <span className="font-medium">Member Since:</span> January 2024
              </div>
              <div>
                <span className="font-medium">Total Orders:</span> 0
              </div>
              <div>
                <span className="font-medium">Total Quotes:</span> 0
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword}
      />
    </div>
  );
};