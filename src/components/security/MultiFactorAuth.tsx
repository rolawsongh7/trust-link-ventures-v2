import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, QrCode, Shield, CheckCircle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MFAService } from '@/lib/advancedSecurity';

export const MultiFactorAuth: React.FC = () => {
  const { user } = useAuth();
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkMFAStatus();
  }, [user]);

  const checkMFAStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const settings = await MFAService.getMFASettings(user.id);
      setMfaEnabled(settings?.enabled || false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!user?.email) return;

    setProcessing(true);
    try {
      // Generate secret
      const newSecret = MFAService.generateSecret();
      setSecret(newSecret);

      // Generate QR code URL
      const otpUrl = MFAService.generateQRCode(user.email, newSecret);
      
      // Generate QR code image
      const qrImage = await MFAService.generateQRCodeImage(otpUrl);
      setQrCodeImage(qrImage);

      toast({
        title: "QR Code Generated",
        description: "Scan this code with your authenticator app"
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const enableMFA = async () => {
    if (!user || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    try {
      // Verify the code first
      const isValid = MFAService.verifyToken(secret, verificationCode);
      
      if (!isValid) {
        toast({
          title: "Invalid Code",
          description: "The code you entered is incorrect",
          variant: "destructive"
        });
        return;
      }

      // Enable MFA in database
      const success = await MFAService.enableMFA(user.id, secret);
      
      if (success) {
        // Generate and store backup codes
        const codes = MFAService.generateBackupCodes();
        await MFAService.storeBackupCodes(user.id, codes);
        setBackupCodes(codes);
        setMfaEnabled(true);
        setQrCodeImage(null);
        setVerificationCode('');
        
        toast({
          title: "MFA Enabled",
          description: "Multi-factor authentication is now active. Save your backup codes!"
        });
      } else {
        throw new Error('Failed to enable MFA');
      }
    } catch (error) {
      console.error('Error enabling MFA:', error);
      toast({
        title: "Error",
        description: "Failed to enable MFA. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const disableMFA = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      const success = await MFAService.disableMFA(user.id);
      
      if (success) {
        setMfaEnabled(false);
        setQrCodeImage(null);
        setVerificationCode('');
        setBackupCodes([]);
        setSecret('');
        
        toast({
          title: "MFA Disabled",
          description: "Multi-factor authentication has been disabled"
        });
      } else {
        throw new Error('Failed to disable MFA');
      }
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast({
        title: "Error",
        description: "Failed to disable MFA. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const generateNewBackupCodes = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      // Delete old codes
      await MFAService.disableMFA(user.id);
      
      // Generate new codes
      const codes = MFAService.generateBackupCodes();
      await MFAService.storeBackupCodes(user.id, codes);
      setBackupCodes(codes);
      
      toast({
        title: "Backup Codes Generated",
        description: "Your new backup codes have been created. Save them securely!"
      });
    } catch (error) {
      console.error('Error generating backup codes:', error);
      toast({
        title: "Error",
        description: "Failed to generate backup codes",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="space-y-6">Loading...</div>;
  }

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
              disabled={processing}
            >
              {processing ? 'Processing...' : mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!mfaEnabled && qrCodeImage && (
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
              <img src={qrCodeImage} alt="QR Code" className="border rounded-lg" />
            </div>
            
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Recommended apps: Google Authenticator, Authy, Microsoft Authenticator
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="manual-secret">Manual Entry Key (if QR scan doesn't work)</Label>
              <div className="p-2 bg-muted rounded border font-mono text-sm break-all">
                {secret}
              </div>
            </div>

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
                <Button 
                  onClick={enableMFA} 
                  disabled={verificationCode.length !== 6 || processing}
                >
                  {processing ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mfaEnabled && backupCodes.length > 0 && (
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
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((code, index) => (
                <div key={index} className="p-2 bg-muted rounded border text-center">
                  {code}
                </div>
              ))}
            </div>
            
            <Alert>
              <AlertDescription>
                Each backup code can only be used once. Generate new codes if you run out.
              </AlertDescription>
            </Alert>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={generateNewBackupCodes}
              disabled={processing}
            >
              Generate New Backup Codes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
