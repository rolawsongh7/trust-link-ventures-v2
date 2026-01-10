import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import { 
  Bell, 
  Mail, 
  FileText, 
  CheckCircle2, 
  ShoppingCart, 
  CreditCard, 
  MapPin,
  Loader2, 
  Check,
  Crown
} from 'lucide-react';

interface AdminNotificationSetting {
  in_app: boolean;
  email: boolean;
}

interface AdminNotificationSettings {
  new_quote_request: AdminNotificationSetting;
  quote_accepted: AdminNotificationSetting;
  new_order: AdminNotificationSetting;
  payment_proof_uploaded: AdminNotificationSetting;
  address_confirmed: AdminNotificationSetting;
}

const defaultSettings: AdminNotificationSettings = {
  new_quote_request: { in_app: true, email: true },
  quote_accepted: { in_app: true, email: true },
  new_order: { in_app: true, email: true },
  payment_proof_uploaded: { in_app: true, email: true },
  address_confirmed: { in_app: true, email: true },
};

const notificationTypes = [
  {
    key: 'new_quote_request' as const,
    label: 'New Quote Requests',
    description: 'When a customer submits a quote request',
    icon: FileText,
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-950/50',
  },
  {
    key: 'quote_accepted' as const,
    label: 'Quote Accepted',
    description: 'When a customer accepts a quote',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  {
    key: 'new_order' as const,
    label: 'New Orders',
    description: 'When a new order is created',
    icon: ShoppingCart,
    iconColor: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-950/50',
  },
  {
    key: 'payment_proof_uploaded' as const,
    label: 'Payment Proof Uploaded',
    description: 'When a customer uploads payment proof',
    icon: CreditCard,
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-950/50',
  },
  {
    key: 'address_confirmed' as const,
    label: 'Address Confirmed',
    description: 'When a customer confirms delivery address',
    icon: MapPin,
    iconColor: 'text-rose-500 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-950/50',
  },
];

export const AdminNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminNotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('admin_notification_settings')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.admin_notification_settings) {
        // Merge with defaults to ensure all keys exist
        const loadedSettings = data.admin_notification_settings as unknown as AdminNotificationSettings;
        setSettings({
          ...defaultSettings,
          ...loadedSettings,
        });
      }
    } catch (error) {
      console.error('Error loading admin notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // First check if a record exists
      const { data: existingData } = await supabase
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('notification_preferences')
          .update({ admin_notification_settings: JSON.parse(JSON.stringify(settings)) as Json })
          .eq('user_id', user.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('notification_preferences')
          .insert([{
            user_id: user.id,
            admin_notification_settings: JSON.parse(JSON.stringify(settings)) as Json,
          }]);
        
        if (error) throw error;
      }

      toast({
        title: "Settings saved",
        description: "Your admin notification preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving admin notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (
    type: keyof AdminNotificationSettings,
    channel: 'in_app' | 'email'
  ) => {
    setSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type][channel],
      },
    }));
  };

  const enableAll = () => {
    const allEnabled = Object.keys(defaultSettings).reduce((acc, key) => ({
      ...acc,
      [key]: { in_app: true, email: true },
    }), {} as AdminNotificationSettings);
    setSettings(allEnabled);
  };

  const disableAll = () => {
    const allDisabled = Object.keys(defaultSettings).reduce((acc, key) => ({
      ...acc,
      [key]: { in_app: false, email: false },
    }), {} as AdminNotificationSettings);
    setSettings(allDisabled);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Admin Notification Preferences
                    <Badge variant="secondary" className="text-xs">Admin Only</Badge>
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about business events
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={enableAll}>
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={disableAll}>
                  Disable All
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Notification Types Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Business Event Notifications
            </CardTitle>
            <CardDescription>
              Configure in-app and email notifications for each event type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Column Headers */}
            <div className="hidden sm:grid grid-cols-[1fr,100px,100px] gap-4 mb-4 pb-2 border-b">
              <div className="text-sm font-medium text-muted-foreground">Event Type</div>
              <div className="text-sm font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
                <Bell className="h-4 w-4" />
                In-App
              </div>
              <div className="text-sm font-medium text-muted-foreground text-center flex items-center justify-center gap-1">
                <Mail className="h-4 w-4" />
                Email
              </div>
            </div>

            <div className="space-y-4">
              {notificationTypes.map((type, index) => {
                const Icon = type.icon;
                const setting = settings[type.key];
                
                return (
                  <motion.div
                    key={type.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="grid grid-cols-1 sm:grid-cols-[1fr,100px,100px] gap-4 items-center py-3 border-b last:border-0"
                  >
                    {/* Event Info */}
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${type.bgColor}`}>
                        <Icon className={`h-5 w-5 ${type.iconColor}`} />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">{type.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                    </div>

                    {/* Mobile Labels */}
                    <div className="sm:hidden flex items-center justify-between gap-4 pl-12">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">In-App</span>
                      </div>
                      <Switch
                        checked={setting.in_app}
                        onCheckedChange={() => toggleSetting(type.key, 'in_app')}
                      />
                    </div>
                    <div className="sm:hidden flex items-center justify-between gap-4 pl-12">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Email</span>
                      </div>
                      <Switch
                        checked={setting.email}
                        onCheckedChange={() => toggleSetting(type.key, 'email')}
                      />
                    </div>

                    {/* Desktop Toggles */}
                    <div className="hidden sm:flex justify-center">
                      <Switch
                        checked={setting.in_app}
                        onCheckedChange={() => toggleSetting(type.key, 'in_app')}
                      />
                    </div>
                    <div className="hidden sm:flex justify-center">
                      <Switch
                        checked={setting.email}
                        onCheckedChange={() => toggleSetting(type.key, 'email')}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="p-2 h-fit rounded-lg bg-blue-100 dark:bg-blue-950/50">
                <Bell className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">How notifications work</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>In-App:</strong> Notifications appear in the bell icon in the admin portal header.
                  You'll see a badge count for unread notifications.
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Email:</strong> Notifications are sent to your registered email address.
                  Critical business events are recommended to have email enabled.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end"
      >
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Admin Preferences
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
