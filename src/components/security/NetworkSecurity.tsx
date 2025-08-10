import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Globe, Shield, AlertTriangle, CheckCircle, Lock, Wifi } from 'lucide-react';

export const NetworkSecurity: React.FC = () => {
  const [securitySettings, setSecuritySettings] = useState({
    httpsOnly: true,
    blockInsecureContent: true,
    strictTransportSecurity: true,
    contentSecurityPolicy: true,
    xssProtection: true,
    frameOptions: true,
    referrerPolicy: true
  });

  const [ipWhitelist, setIpWhitelist] = useState([
    '192.168.1.100',
    '10.0.0.50',
    '203.0.113.10'
  ]);

  const [newIp, setNewIp] = useState('');

  const addIpToWhitelist = () => {
    if (newIp && !ipWhitelist.includes(newIp)) {
      setIpWhitelist([...ipWhitelist, newIp]);
      setNewIp('');
    }
  };

  const removeIpFromWhitelist = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter(i => i !== ip));
  };

  const securityHeaders = [
    { name: 'HTTPS Only', key: 'httpsOnly', description: 'Force all connections to use HTTPS' },
    { name: 'Block Mixed Content', key: 'blockInsecureContent', description: 'Block insecure HTTP content on HTTPS pages' },
    { name: 'HSTS', key: 'strictTransportSecurity', description: 'HTTP Strict Transport Security' },
    { name: 'CSP', key: 'contentSecurityPolicy', description: 'Content Security Policy' },
    { name: 'XSS Protection', key: 'xssProtection', description: 'Cross-site scripting protection' },
    { name: 'Frame Options', key: 'frameOptions', description: 'X-Frame-Options header' },
    { name: 'Referrer Policy', key: 'referrerPolicy', description: 'Control referrer information' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            HTTP Security Headers
          </CardTitle>
          <CardDescription>
            Configure security headers to protect against common web vulnerabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securityHeaders.map((header) => (
            <div key={header.key} className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="font-medium">{header.name}</Label>
                <p className="text-sm text-muted-foreground">{header.description}</p>
              </div>
              <Switch
                checked={securitySettings[header.key as keyof typeof securitySettings]}
                onCheckedChange={(checked) => 
                  setSecuritySettings(prev => ({ ...prev, [header.key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            IP Address Whitelist
          </CardTitle>
          <CardDescription>
            Restrict access to specific IP addresses for enhanced security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="192.168.1.100"
              className="flex-1"
            />
            <Button onClick={addIpToWhitelist} disabled={!newIp}>
              Add IP
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Whitelisted IP Addresses</Label>
            <div className="space-y-2">
              {ipWhitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="font-mono text-sm">{ip}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeIpFromWhitelist(ip)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            SSL/TLS Configuration
          </CardTitle>
          <CardDescription>
            Secure connection settings and certificate information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">TLS 1.3</span>
              </div>
              <p className="text-sm text-muted-foreground">Latest secure protocol enabled</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">ECDSA Certificate</span>
              </div>
              <p className="text-sm text-muted-foreground">Valid until Dec 2024</p>
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your SSL certificate is valid and supports modern encryption standards.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Monitoring</CardTitle>
          <CardDescription>
            Real-time security monitoring and threat detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-500">0</div>
              <div className="text-sm text-muted-foreground">Blocked Attacks</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-500">1,247</div>
              <div className="text-sm text-muted-foreground">Requests Scanned</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-500">3</div>
              <div className="text-sm text-muted-foreground">Suspicious IPs</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Recent Security Events</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Multiple failed login attempts from 203.0.113.50</span>
                </div>
                <Badge variant="secondary">2 hours ago</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">SSL certificate renewed successfully</span>
                </div>
                <Badge variant="secondary">1 day ago</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};