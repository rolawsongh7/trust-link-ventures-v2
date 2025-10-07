import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Globe, Plus, Trash2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const IPWhitelistManagement: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [whitelist, setWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [currentIP, setCurrentIP] = useState<string>('');
  const [newIP, setNewIP] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current IP
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      setCurrentIP(ip);

      // Load whitelist
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWhitelist((data || []).map(entry => ({
        ...entry,
        ip_address: String(entry.ip_address)
      })));
    } catch (error) {
      console.error('Error loading IP whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to load IP whitelist',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIP = async (ipAddress: string, description: string) => {
    if (!user) return;

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipAddress)) {
      toast({
        title: 'Invalid IP Address',
        description: 'Please enter a valid IPv4 address',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .insert({
          user_id: user.id,
          ip_address: ipAddress,
          description,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: 'IP Added',
        description: `${ipAddress} has been added to the whitelist`
      });

      setNewIP('');
      setNewDescription('');
      setShowAddDialog(false);
      loadData();
    } catch (error: any) {
      console.error('Error adding IP:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add IP to whitelist',
        variant: 'destructive'
      });
    }
  };

  const handleToggleIP = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'IP Disabled' : 'IP Enabled',
        description: isActive ? 'IP address has been disabled' : 'IP address has been enabled'
      });

      loadData();
    } catch (error) {
      console.error('Error toggling IP:', error);
      toast({
        title: 'Error',
        description: 'Failed to update IP status',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveIP = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'IP Removed',
        description: 'IP address has been removed from the whitelist'
      });

      loadData();
    } catch (error) {
      console.error('Error removing IP:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove IP from whitelist',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                IP Address Whitelisting
              </CardTitle>
              <CardDescription>
                Restrict admin portal access to specific IP addresses
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add IP
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add IP to Whitelist</DialogTitle>
                  <DialogDescription>
                    Add an IP address to allow admin portal access
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ip-address">IP Address</Label>
                    <Input
                      id="ip-address"
                      placeholder="192.168.1.1"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Office network, Home, VPN, etc."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => handleAddIP(newIP, newDescription)}
                    className="w-full"
                    disabled={!newIP}
                  >
                    Add to Whitelist
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              Your current IP address: <strong>{currentIP}</strong>
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={() => handleAddIP(currentIP, 'Current IP address')}
              >
                Add Current IP
              </Button>
            </AlertDescription>
          </Alert>

          {whitelist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No IP addresses whitelisted yet</p>
              <p className="text-sm">Add your current IP or specific IP ranges to restrict access</p>
            </div>
          ) : (
            <div className="space-y-3">
              {whitelist.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {entry.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-mono font-medium">{entry.ip_address}</div>
                      {entry.description && (
                        <div className="text-sm text-muted-foreground">{entry.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Added {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                      {entry.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                    <Switch
                      checked={entry.is_active}
                      onCheckedChange={() => handleToggleIP(entry.id, entry.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveIP(entry.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert variant="default" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Make sure to add your current IP address before enabling IP whitelisting. 
              Otherwise, you may lose access to the admin portal.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
