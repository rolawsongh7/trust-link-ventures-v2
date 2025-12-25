import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { User, Building2, Mail, Phone, MapPin, Save, LogOut, X } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useToast } from '@/hooks/use-toast';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { ProfileAvatar } from './ProfileAvatar';
import { ProfileCompletion } from './ProfileCompletion';
import { SecurityScore } from './SecurityScore';
import { AccountStats } from './AccountStats';
import { ActiveSessionsDialog } from './ActiveSessionsDialog';
import { SecurityAlertsDialog } from './SecurityAlertsDialog';


export const CustomerProfile: React.FC = () => {
  const { profile, updateProfile, signOut } = useCustomerAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showActiveSessions, setShowActiveSessions] = useState(false);
  const [showSecurityAlerts, setShowSecurityAlerts] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
    industry: profile?.industry || ''
  });

  // Scroll to section based on URL hash
  useEffect(() => {
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.hash]);

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

  const calculateCompletion = () => {
    if (!profile) return 0;
    
    const fields = [
      profile.full_name,
      profile.company_name,
      profile.email,
      profile.phone,
      profile.country,
      profile.industry,
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Enhanced Gradient Header with Avatar */}
      <div className="relative overflow-hidden rounded-t-xl bg-gradient-to-r from-trustlink-navy to-trustlink-maritime p-6 text-white shadow-md">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="profile-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#profile-grid)" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Top Section: Title + Profile Completion Badge */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold mb-1 text-white">Profile Settings</h1>
              <p className="text-sm md:text-base text-white/90">
                Manage your account settings and preferences
              </p>
            </div>
            
            {/* Profile Completion Badge */}
            <div className="rounded-full bg-trustlink-gold px-4 py-2 shadow-md">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-white" />
                <span className="text-white font-semibold text-lg">{completionPercentage}%</span>
              </div>
            </div>
          </div>
          
          {/* Avatar + Info Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mt-8">
            <div className="flex flex-col items-center sm:items-start">
              <ProfileAvatar />
            </div>
            <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
              <h2 className="text-xl font-semibold text-white">{profile?.full_name || 'Guest User'}</h2>
              <p className="text-white/80">{profile?.email}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                {profile?.email && (
                  <span className="text-xs bg-white/20 border border-white/30 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                    ✓ Email Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Quick Stats Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/20 backdrop-blur-sm text-white">
              <Building2 className="h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="text-xs opacity-90">Company</div>
                <div className="text-sm font-semibold truncate">{profile?.company_name || 'Not set'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/20 backdrop-blur-sm text-white">
              <MapPin className="h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="text-xs opacity-90">Country</div>
                <div className="text-sm font-semibold truncate">{profile?.country || 'Not set'}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/30 bg-white/20 backdrop-blur-sm text-white">
              <Phone className="h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="text-xs opacity-90">Phone</div>
                <div className="text-sm font-semibold truncate">{profile?.phone || 'Not set'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <Card className="bg-tl-surface/80 backdrop-blur-md border-tl-border border-l-4 border-l-maritime-500 shadow-lg hover:shadow-xl transition-shadow">
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
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-tl-muted" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="pl-11 bg-tl-muted/20 border-tl-border text-tl-muted"
                  />
                </div>
                <p className="text-xs text-tl-muted mt-1">
                  Email address cannot be changed. Contact support if you need to update this.
                </p>
              </div>

              <div id="contact" className="grid grid-cols-1 md:grid-cols-2 gap-4 scroll-mt-24">
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

              <div id="details" className="space-y-2 scroll-mt-24">
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

        {/* Right Column - Stats & Security */}
        <div className="space-y-6">
          {/* Account Stats Dashboard */}
          <AccountStats />

          {/* Enhanced Security Section */}
          <SecurityScore 
            onChangePassword={() => setShowChangePassword(true)}
            onViewSessions={() => setShowActiveSessions(true)}
            onManageAlerts={() => setShowSecurityAlerts(true)}
            lastPasswordChanged={profile?.last_password_changed}
          />

          {/* Quick Sign Out */}
          <Card id="security" className="border-l-4 border-l-red-500 shadow-lg hover:shadow-xl transition-all scroll-mt-24">
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                className="w-full"
                onClick={signOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword}
      />

      <ActiveSessionsDialog
        open={showActiveSessions}
        onOpenChange={setShowActiveSessions}
      />

      <SecurityAlertsDialog
        open={showSecurityAlerts}
        onOpenChange={setShowSecurityAlerts}
      />
    </div>
  );
};