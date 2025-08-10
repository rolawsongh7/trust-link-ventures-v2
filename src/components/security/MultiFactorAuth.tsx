import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, QrCode, Shield, CheckCircle, Clock, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MultiFactorAuth: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes] = useState([
    'ABC123DEF456',
    'GHI789JKL012',
    'MNO345PQR678',
    'STU901VWX234',
    'YZA567BCD890'
  ]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const { toast } = useToast();

  const generateQRCode = () => {
    // Simulated QR code generation
    setQrCode('https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=otpauth://totp/SeaproSAS:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=SeaproSAS');
    toast({
      title: "QR Code Generated",
      description: "Scan this code with your authenticator app"
    });
  };

  const enableMFA = () => {
    if (verificationCode.length === 6) {
      setMfaEnabled(true);
      toast({
        title: "MFA Enabled",
        description: "Multi-factor authentication is now active"
      });
    } else {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
    }
  };

  const disableMFA = () => {
    setMfaEnabled(false);
    setQrCode(null);
    setVerificationCode('');
    toast({
      title: "MFA Disabled",
      description: "Multi-factor authentication has been disabled"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication Status
          </CardTitle>
          <CardDescription>
            Secure your account with an additional layer of protection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={mfaEnabled ? "default" : "secondary"}>
                {mfaEnabled ? <CheckCircle className="h-3 w-3 mr-1" /> : null}
                {mfaEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {mfaEnabled ? 'Your account is protected with 2FA' : 'Enhance security by enabling 2FA'}
              </span>
            </div>
            <Button 
              variant={mfaEnabled ? "destructive" : "default"}
              onClick={mfaEnabled ? disableMFA : generateQRCode}
            >
              {mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!mfaEnabled && qrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Setup Authenticator App
            </CardTitle>
            <CardDescription>
              Scan this QR code with your preferred authenticator app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="border rounded-lg" />
            </div>
            
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Recommended apps: Google Authenticator, Authy, Microsoft Authenticator
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Enter 6-digit code from your app</Label>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-lg font-mono"
                  maxLength={6}
                />
                <Button onClick={enableMFA} disabled={verificationCode.length !== 6}>
                  Verify & Enable
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mfaEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Save these codes in a secure location. Use them if you lose access to your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-muted rounded border">
                  {code}
                </div>
              ))}
            </div>
            
            <Alert>
              <AlertDescription>
                Each backup code can only be used once. Generate new codes if you run out.
              </AlertDescription>
            </Alert>
            
            <Button variant="outline" className="w-full">
              Generate New Backup Codes
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Authentication Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Successful login</p>
                <p className="text-sm text-muted-foreground">Chrome on Windows • San Francisco, CA</p>
              </div>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">MFA code generated</p>
                <p className="text-sm text-muted-foreground">Mobile app verification</p>
              </div>
              <span className="text-sm text-muted-foreground">1 day ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};