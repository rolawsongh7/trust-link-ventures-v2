import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { NetworkSecurityService, NetworkSecuritySettings, IPWhitelistEntry } from '@/lib/networkSecurity';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Plus, Trash2, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const NetworkSecurity: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [currentIP, setCurrentIP] = useState<string>('');
  const [settings, setSettings] = useState<NetworkSecuritySettings>({
    block_vpn: false,
    block_tor: true,
    enable_geo_blocking: false,
    risk_threshold: 70
  });
  const [whitelist, setWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [newIPDescription, setNewIPDescription] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadSecurityData();
    }
  }, [user]);

  const loadSecurityData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [ip, userSettings, userWhitelist] = await Promise.all([
        NetworkSecurityService.getCurrentIP(),
        NetworkSecurityService.getSecuritySettings(user.id),
        NetworkSecurityService.getIPWhitelist(user.id)
      ]);

      if (ip) setCurrentIP(ip);
      if (userSettings) setSettings(userSettings);
      setWhitelist(userWhitelist);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load network security settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = async (key: keyof NetworkSecuritySettings, value: boolean | number) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    const success = await NetworkSecurityService.updateSecuritySettings(user.id, { [key]: value });
    if (success) {
      toast({
        title: 'Settings Updated',
        description: 'Network security settings have been updated successfully'
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive'
      });
      setSettings(settings);
    }
  };

  const handleAddCurrentIP = async () => {
    if (!user || !currentIP) return;

    const success = await NetworkSecurityService.addIPToWhitelist(
      user.id,
      currentIP,
      newIPDescription || 'Current IP address'
    );

    if (success) {
      toast({
        title: 'IP Added',
        description: 'Your current IP has been added to the whitelist'
      });
      setNewIPDescription('');
      setShowAddDialog(false);
      loadSecurityData();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add IP to whitelist',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveIP = async (id: string) => {
    const success = await NetworkSecurityService.removeIPFromWhitelist(id);
    if (success) {
      toast({
        title: 'IP Removed',
        description: 'IP address has been removed from the whitelist'
      });
      loadSecurityData();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to remove IP from whitelist',
        variant: 'destructive'
      });
    }
  };

  const handleToggleIP = async (id: string, isActive: boolean) => {
    const success = await NetworkSecurityService.toggleIPStatus(id, !isActive);
    if (success) {
      toast({
        title: 'Status Updated',
        description: `IP has been ${!isActive ? 'enabled' : 'disabled'}`
      });
      loadSecurityData();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading network security settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Network Security Settings</CardTitle>
          </div>
          <CardDescription>
            Configure network-level security controls and access restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="block-tor">Block Tor Connections</Label>
              <p className="text-sm text-muted-foreground">
                Prevent access from Tor exit nodes
              </p>
            </div>
            <Switch
              id="block-tor"
              checked={settings.block_tor}
              onCheckedChange={(checked) => handleSettingsChange('block_tor', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="block-vpn">Block VPN Connections</Label>
              <p className="text-sm text-muted-foreground">
                Restrict access from known VPN providers
              </p>
            </div>
            <Switch
              id="block-vpn"
              checked={settings.block_vpn}
              onCheckedChange={(checked) => handleSettingsChange('block_vpn', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="geo-blocking">Enable Geo-Blocking</Label>
              <p className="text-sm text-muted-foreground">
                Block access from specific countries
              </p>
            </div>
            <Switch
              id="geo-blocking"
              checked={settings.enable_geo_blocking}
              onCheckedChange={(checked) => handleSettingsChange('enable_geo_blocking', checked)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Risk Threshold: {settings.risk_threshold}</Label>
              <Badge variant={settings.risk_threshold > 70 ? 'default' : 'secondary'}>
                {settings.risk_threshold > 70 ? 'High Security' : 'Balanced'}
              </Badge>
            </div>
            <Slider
              value={[settings.risk_threshold]}
              onValueChange={([value]) => handleSettingsChange('risk_threshold', value)}
              min={0}
              max={100}
              step={10}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Connections with risk scores above this threshold will be blocked
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Your Current IP Address</CardTitle>
          </div>
          <CardDescription>
            Add your current IP to the whitelist for guaranteed access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono text-base px-4 py-2">
              {currentIP || 'Loading...'}
            </Badge>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Whitelist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add IP to Whitelist</DialogTitle>
                  <DialogDescription>
                    Add a description for this IP address (optional)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g., Home Office, Work VPN"
                      value={newIPDescription}
                      onChange={(e) => setNewIPDescription(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddCurrentIP} className="w-full">
                    Add IP: {currentIP}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IP Whitelist</CardTitle>
          <CardDescription>
            Whitelisted IPs bypass all network security restrictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {whitelist.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No whitelisted IP addresses yet
            </p>
          ) : (
            <div className="space-y-3">
              {whitelist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {entry.is_active ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-mono font-medium">{entry.ip_address}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added: {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={entry.is_active}
                      onCheckedChange={() => handleToggleIP(entry.id, entry.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIP(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
