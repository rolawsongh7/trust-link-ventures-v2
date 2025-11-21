import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, KeyRound, AlertCircle } from 'lucide-react';
import { MFAService, DeviceFingerprintService } from '@/lib/advancedSecurity';

interface MFAVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onVerified: (trustDevice: boolean) => void;
  onCancel: () => void;
}

export const MFAVerificationModal: React.FC<MFAVerificationModalProps> = ({
  open,
  onOpenChange,
  userId,
  onVerified,
  onCancel,
}) => {
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('totp');

  const handleVerifyTOTP = async () => {
    setError('');
    setLoading(true);

    try {
      // Check rate limit
      const isRateLimited = await MFAService.checkRateLimit(userId);
      if (isRateLimited) {
        setError('Too many failed attempts. Please try again in 15 minutes.');
        setLoading(false);
        return;
      }

      // Get user's MFA settings
      const mfaSettings = await MFAService.getMFASettings(userId);
      if (!mfaSettings?.secret) {
        setError('MFA not properly configured');
        setLoading(false);
        return;
      }

      // Verify the TOTP code using secure server-side verification
      const isValid = await MFAService.verifyToken(userId, totpCode);

      // Log the attempt
      await MFAService.logMFAAttempt(userId, isValid);

      if (isValid) {
        // Generate device fingerprint if trusting device
        if (trustDevice) {
          const fingerprint = await DeviceFingerprintService.generateFingerprint();
          await DeviceFingerprintService.logDeviceFingerprint(userId);
        }

        onVerified(trustDevice);
      } else {
        setError('Invalid code. Check your device time is correct and try a new code (refreshes every 30 seconds).');
      }
    } catch (err) {
      console.error('MFA verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBackupCode = async () => {
    setError('');
    setLoading(true);

    try {
      const isValid = await MFAService.verifyBackupCode(userId, backupCode.toUpperCase());

      await MFAService.logMFAAttempt(userId, isValid);

      if (isValid) {
        onVerified(false); // Don't trust device with backup code
      } else {
        setError('Invalid backup code. Please try again.');
      }
    } catch (err) {
      console.error('Backup code verification error:', err);
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTotpCode('');
    setBackupCode('');
    setError('');
    setTrustDevice(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter your authentication code to continue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Authenticator
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Backup Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="totp" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp">6-Digit Code</Label>
              <Input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerifyTOTP()}
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-muted-foreground">
                Enter the code from your authenticator app
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="trust"
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked as boolean)}
              />
              <Label
                htmlFor="trust"
                className="text-sm font-normal cursor-pointer"
              >
                Trust this device for 30 days
              </Label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyTOTP}
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backup">Backup Code</Label>
              <Input
                id="backup"
                type="text"
                placeholder="XXXXXXXX"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleVerifyBackupCode()}
                className="text-center text-lg tracking-wider uppercase"
                maxLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Enter one of your backup codes (can only be used once)
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleVerifyBackupCode}
                disabled={loading || backupCode.length !== 8}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
