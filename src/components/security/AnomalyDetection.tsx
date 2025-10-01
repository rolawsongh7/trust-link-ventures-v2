import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AnomalyDetectionService, AnomalyDetectionSettings } from '@/lib/anomalyDetection';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Shield, Activity, TrendingUp, Clock, MapPin } from 'lucide-react';

export const AnomalyDetection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AnomalyDetectionSettings>({
    enable_login_pattern_detection: true,
    enable_velocity_checks: true,
    enable_location_analysis: true,
    enable_device_fingerprint_checks: true,
    sensitivity_level: 'medium',
    auto_block_threshold: 70,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const userSettings = await AnomalyDetectionService.getSettings(user.id);
      if (userSettings) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error('Error loading anomaly detection settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load anomaly detection settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = async (
    key: keyof AnomalyDetectionSettings,
    value: boolean | string | number
  ) => {
    if (!user) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    const success = await AnomalyDetectionService.updateSettings(user.id, { [key]: value });
    if (success) {
      toast({
        title: 'Settings Updated',
        description: 'Anomaly detection settings have been updated successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      setSettings(settings);
    }
  };

  const getSensitivityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getThresholdColor = (threshold: number) => {
    if (threshold >= 70) return 'text-red-500';
    if (threshold >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return <div className="text-center py-8">Loading anomaly detection settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Anomaly Detection & Behavioral Analysis</CardTitle>
          </div>
          <CardDescription>
            Advanced machine learning algorithms monitor your login patterns and detect unusual activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">Pattern Learning</p>
                <p className="text-xs text-muted-foreground">Behavioral analysis active</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">Risk Scoring</p>
                <p className="text-xs text-muted-foreground">Real-time evaluation</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">Auto-blocking</p>
                <p className="text-xs text-muted-foreground">Suspicious activity</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection Methods</CardTitle>
          <CardDescription>
            Enable or disable specific anomaly detection techniques
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <Label htmlFor="login-pattern">Login Pattern Detection</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Analyze typical login times and frequency patterns
              </p>
            </div>
            <Switch
              id="login-pattern"
              checked={settings.enable_login_pattern_detection}
              onCheckedChange={(checked) =>
                handleSettingsChange('enable_login_pattern_detection', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <Label htmlFor="velocity">Velocity Checks</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Detect impossible travel between login locations
              </p>
            </div>
            <Switch
              id="velocity"
              checked={settings.enable_velocity_checks}
              onCheckedChange={(checked) =>
                handleSettingsChange('enable_velocity_checks', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <Label htmlFor="location">Location Analysis</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Monitor for logins from new or unusual locations
              </p>
            </div>
            <Switch
              id="location"
              checked={settings.enable_location_analysis}
              onCheckedChange={(checked) =>
                handleSettingsChange('enable_location_analysis', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label htmlFor="device">Device Fingerprint Checks</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Verify device and browser characteristics
              </p>
            </div>
            <Switch
              id="device"
              checked={settings.enable_device_fingerprint_checks}
              onCheckedChange={(checked) =>
                handleSettingsChange('enable_device_fingerprint_checks', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sensitivity Settings</CardTitle>
          <CardDescription>
            Configure how aggressively anomalies are detected and handled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sensitivity">Detection Sensitivity</Label>
              <Badge variant="outline" className={getSensitivityColor(settings.sensitivity_level)}>
                {settings.sensitivity_level.toUpperCase()}
              </Badge>
            </div>
            <Select
              value={settings.sensitivity_level}
              onValueChange={(value) => handleSettingsChange('sensitivity_level', value)}
            >
              <SelectTrigger id="sensitivity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Fewer false positives</SelectItem>
                <SelectItem value="medium">Medium - Balanced approach</SelectItem>
                <SelectItem value="high">High - Maximum security</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Higher sensitivity may result in more false positives but provides better security
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Auto-block Threshold: {settings.auto_block_threshold}</Label>
              <Badge variant="outline" className={getThresholdColor(settings.auto_block_threshold)}>
                {settings.auto_block_threshold >= 70
                  ? 'Strict'
                  : settings.auto_block_threshold >= 50
                  ? 'Moderate'
                  : 'Permissive'}
              </Badge>
            </div>
            <Slider
              value={[settings.auto_block_threshold]}
              onValueChange={([value]) => handleSettingsChange('auto_block_threshold', value)}
              min={30}
              max={90}
              step={10}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Logins with anomaly scores above this threshold will be automatically blocked
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>How It Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Our anomaly detection system continuously learns your normal behavior patterns including:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Typical login times and days</li>
            <li>Common geographic locations</li>
            <li>Regular devices and browsers</li>
            <li>Session duration patterns</li>
            <li>Login frequency</li>
          </ul>
          <p>
            When a login attempt deviates significantly from your established patterns, the system
            calculates a risk score. High-risk logins can trigger alerts or be automatically blocked.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
