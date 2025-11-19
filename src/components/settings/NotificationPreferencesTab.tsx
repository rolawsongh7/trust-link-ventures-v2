import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Mail, Smartphone, MessageSquare, Package, FileText, Shield, TrendingUp, Clock, Loader2, Check } from 'lucide-react';

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  order_updates: boolean;
  quote_updates: boolean;
  security_alerts: boolean;
  marketing: boolean;
  digest_frequency: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export const NotificationPreferencesTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_enabled: true,
    push_enabled: true,
    sms_enabled: false,
    order_updates: true,
    quote_updates: true,
    security_alerts: true,
    marketing: false,
    digest_frequency: 'daily',
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your notification settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
      {/* Notification Channels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="email">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates via email
                  </p>
                </div>
              </div>
              <Switch
                id="email"
                checked={preferences.email_enabled}
                onCheckedChange={(email_enabled) => setPreferences({ ...preferences, email_enabled })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="push">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get instant updates on your device
                  </p>
                </div>
              </div>
              <Switch
                id="push"
                checked={preferences.push_enabled}
                onCheckedChange={(push_enabled) => setPreferences({ ...preferences, push_enabled })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sms">SMS Notifications</Label>
                    <Badge variant="secondary" className="text-xs">Premium</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive critical alerts via text message
                  </p>
                </div>
              </div>
              <Switch
                id="sms"
                checked={preferences.sms_enabled}
                onCheckedChange={(sms_enabled) => setPreferences({ ...preferences, sms_enabled })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Notification Types</CardTitle>
            <CardDescription>
              Customize which notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="orders">Order Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Status changes, shipments, and deliveries
                  </p>
                </div>
              </div>
              <Switch
                id="orders"
                checked={preferences.order_updates}
                onCheckedChange={(order_updates) => setPreferences({ ...preferences, order_updates })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="quotes">Quote Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    New quotes, approvals, and responses
                  </p>
                </div>
              </div>
              <Switch
                id="quotes"
                checked={preferences.quote_updates}
                onCheckedChange={(quote_updates) => setPreferences({ ...preferences, quote_updates })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-red-500" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="security">Security Alerts</Label>
                    <Badge variant="destructive" className="text-xs">Important</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Login attempts, password changes, and suspicious activity
                  </p>
                </div>
              </div>
              <Switch
                id="security"
                checked={preferences.security_alerts}
                onCheckedChange={(security_alerts) => setPreferences({ ...preferences, security_alerts })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div className="space-y-0.5">
                  <Label htmlFor="marketing">Marketing & Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Product updates, tips, and promotional offers
                  </p>
                </div>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing}
                onCheckedChange={(marketing) => setPreferences({ ...preferences, marketing })}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Digest Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Digest Settings</CardTitle>
            <CardDescription>
              Get a summary of notifications at regular intervals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="digest">Digest Frequency</Label>
              <Select
                value={preferences.digest_frequency}
                onValueChange={(digest_frequency) => setPreferences({ ...preferences, digest_frequency })}
              >
                <SelectTrigger id="digest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (Instant)</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quiet Hours */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Pause non-urgent notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={preferences.quiet_hours_start || ''}
                  onChange={(e) => setPreferences({ ...preferences, quiet_hours_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={preferences.quiet_hours_end || ''}
                  onChange={(e) => setPreferences({ ...preferences, quiet_hours_end: e.target.value })}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Security alerts will still be delivered during quiet hours
            </p>
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
        <Button onClick={savePreferences} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Preferences
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};