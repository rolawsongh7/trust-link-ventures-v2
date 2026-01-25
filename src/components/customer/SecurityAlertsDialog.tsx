import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Bell, Smartphone, MapPin, Lock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlertsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AlertSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

export const SecurityAlertsDialog: React.FC<SecurityAlertsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<AlertSetting[]>([
    {
      id: 'new_device',
      title: 'New Device Login',
      description: 'Alert when your account is accessed from a new device',
      icon: Smartphone,
      enabled: true,
    },
    {
      id: 'new_location',
      title: 'New Location Login',
      description: 'Alert when login occurs from an unusual location',
      icon: MapPin,
      enabled: true,
    },
    {
      id: 'password_change',
      title: 'Password Changes',
      description: 'Notify when your password is changed',
      icon: Lock,
      enabled: true,
    },
    {
      id: 'failed_login',
      title: 'Failed Login Attempts',
      description: 'Alert after multiple failed login attempts',
      icon: AlertTriangle,
      enabled: true,
    },
    {
      id: 'mfa_change',
      title: 'MFA Status Changes',
      description: 'Notify when two-factor authentication is enabled or disabled',
      icon: Shield,
      enabled: true,
    },
    {
      id: 'account_changes',
      title: 'Account Information Changes',
      description: 'Alert when profile or contact information is updated',
      icon: Mail,
      enabled: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
      )
    );
  };

  const handleSave = () => {
    // Here you would save to database
    toast({
      title: 'Settings Saved',
      description: 'Your security alert preferences have been updated.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Security Alerts
          </DialogTitle>
          <DialogDescription>
            Choose which security events you want to be notified about via email
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-4 mt-4">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <div
                key={alert.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-maritime-500/10 text-maritime-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={alert.id}
                      className="text-base font-medium cursor-pointer"
                    >
                      {alert.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
                <Switch
                  id={alert.id}
                  checked={alert.enabled}
                  onCheckedChange={() => handleToggle(alert.id)}
                />
              </div>
            );
          })}
        </div>
        </div>

        <div className="flex-shrink-0 flex justify-between items-center mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {alerts.filter((a) => a.enabled).length} of {alerts.length} alerts
            enabled
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
