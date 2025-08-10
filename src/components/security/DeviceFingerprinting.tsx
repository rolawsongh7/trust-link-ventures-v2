import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Fingerprint, Monitor, Smartphone, Laptop, AlertTriangle, CheckCircle } from 'lucide-react';

export const DeviceFingerprinting: React.FC = () => {
  const [fingerprintingEnabled, setFingerprintingEnabled] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [trustedDevices] = useState([
    {
      id: '1',
      name: 'MacBook Pro',
      type: 'desktop',
      fingerprint: 'fp_abc123def456',
      lastSeen: '2024-01-15T10:30:00Z',
      location: 'San Francisco, CA',
      trusted: true
    },
    {
      id: '2',
      name: 'iPhone 15',
      type: 'mobile',
      fingerprint: 'fp_ghi789jkl012',
      lastSeen: '2024-01-15T09:15:00Z',
      location: 'San Francisco, CA',
      trusted: true
    },
    {
      id: '3',
      name: 'Chrome on Windows',
      type: 'desktop',
      fingerprint: 'fp_mno345pqr678',
      lastSeen: '2024-01-14T16:45:00Z',
      location: 'New York, NY',
      trusted: false
    }
  ]);

  useEffect(() => {
    // Simulate device fingerprinting
    const collectDeviceInfo = () => {
      const info = {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookiesEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        fingerprint: 'fp_current_session_' + Math.random().toString(36).substr(2, 9)
      };
      setDeviceInfo(info);
    };

    collectDeviceInfo();
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getDeviceTypeName = (userAgent: string) => {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
    if (/Tablet/.test(userAgent)) return 'Tablet';
    return 'Desktop';
  };

  const getBrowserName = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Device Fingerprinting Settings
          </CardTitle>
          <CardDescription>
            Track and identify devices for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-medium">Enable Device Fingerprinting</Label>
              <p className="text-sm text-muted-foreground">
                Collect device characteristics to identify unique devices
              </p>
            </div>
            <Switch
              checked={fingerprintingEnabled}
              onCheckedChange={setFingerprintingEnabled}
            />
          </div>

          {fingerprintingEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Device fingerprinting helps detect suspicious activity but may impact user privacy.
                Ensure compliance with local privacy laws.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {deviceInfo && fingerprintingEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Current Device Information</CardTitle>
            <CardDescription>
              Information collected from your current device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Device Type</Label>
                <div className="flex items-center gap-2">
                  {getDeviceIcon(getDeviceTypeName(deviceInfo.userAgent).toLowerCase())}
                  <span className="text-sm">{getDeviceTypeName(deviceInfo.userAgent)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Browser</Label>
                <span className="text-sm">{getBrowserName(deviceInfo.userAgent)}</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Screen Resolution</Label>
                <span className="text-sm font-mono">{deviceInfo.screen}</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Timezone</Label>
                <span className="text-sm">{deviceInfo.timezone}</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Language</Label>
                <span className="text-sm">{deviceInfo.language}</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Platform</Label>
                <span className="text-sm">{deviceInfo.platform}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Device Fingerprint</Label>
              <div className="p-2 bg-muted rounded font-mono text-sm">
                {deviceInfo.fingerprint}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Trusted Devices
          </CardTitle>
          <CardDescription>
            Manage devices that are trusted for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {trustedDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getDeviceIcon(device.type)}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{device.name}</span>
                    {device.trusted ? (
                      <Badge className="bg-green-500">Trusted</Badge>
                    ) : (
                      <Badge variant="destructive">Untrusted</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Last seen: {new Date(device.lastSeen).toLocaleDateString()} • {device.location}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {device.fingerprint}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!device.trusted && (
                  <Button variant="outline" size="sm">
                    Trust Device
                  </Button>
                )}
                <Button variant="destructive" size="sm">
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Security Analytics</CardTitle>
          <CardDescription>
            Insights from device fingerprinting data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-500">5</div>
              <div className="text-sm text-muted-foreground">Total Devices</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-500">3</div>
              <div className="text-sm text-muted-foreground">Trusted Devices</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">1</div>
              <div className="text-sm text-muted-foreground">New Device</div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              A new device from New York, NY was detected 2 days ago. 
              <Button variant="link" className="p-0 h-auto font-normal">
                Review device
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};