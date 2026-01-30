import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Construction, 
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface MaintenanceStatus {
  enabled: boolean;
  message: string | null;
  started_at: string | null;
}

export const MaintenanceModeCard = () => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<MaintenanceStatus>({ enabled: false, message: null, started_at: null });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setFetching(true);
    try {
      const { data, error } = await supabase.rpc('get_maintenance_mode');
      if (error) throw error;
      
      const statusData = data as unknown as MaintenanceStatus;
      setStatus(statusData);
      setMessage(statusData.message || '');
    } catch (error: any) {
      console.error('Failed to fetch maintenance status:', error);
    } finally {
      setFetching(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!hasSuperAdminAccess) return;
    
    setLoading(true);
    try {
      const newEnabled = !status.enabled;
      const { data, error } = await supabase.rpc('toggle_maintenance_mode', {
        p_enabled: newEnabled,
        p_message: newEnabled ? message || 'System under maintenance. Please try again later.' : null
      });
      
      if (error) throw error;
      
      toast({
        title: newEnabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        description: newEnabled 
          ? 'Users will see a maintenance banner.' 
          : 'System is now fully operational.',
      });
      
      await fetchStatus();
    } catch (error: any) {
      console.error('Failed to toggle maintenance mode:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle maintenance mode',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasSuperAdminAccess) return null;

  return (
    <Card className={status.enabled ? 'border-orange-500/50' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Construction className="h-5 w-5" />
          Maintenance Mode
          {status.enabled && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Enable maintenance mode to show a banner to all users. Admins can still operate normally.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.enabled && (
          <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              Maintenance mode is currently active. Users see a maintenance banner.
              {status.started_at && (
                <span className="block text-xs mt-1">
                  Started: {new Date(status.started_at).toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="maintenance-message">Maintenance Message</Label>
          <Input
            id="maintenance-message"
            placeholder="Enter message to display to users..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading || status.enabled}
          />
          <p className="text-xs text-muted-foreground">
            This message will be shown in the maintenance banner.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {status.enabled ? (
              <XCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm">
              {status.enabled ? 'Maintenance active' : 'System operational'}
            </span>
          </div>
          <Button
            onClick={toggleMaintenanceMode}
            disabled={loading || fetching}
            variant={status.enabled ? 'default' : 'destructive'}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {status.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
