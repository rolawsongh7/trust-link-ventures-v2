import { useState, useEffect } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { MFAService } from '@/lib/advancedSecurity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Copy, Check, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CustomerMFASetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerMFASetup({ open, onOpenChange }: CustomerMFASetupProps) {
  const { user } = useCustomerAuth();
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (open && user) {
      checkMFAStatus();
    }
  }, [open, user]);

  const checkMFAStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const settings = await MFAService.getMFASettings(user.id);
      setMfaEnabled(settings?.enabled || false);
    } catch (error) {
      console.error('Error checking MFA status:', error);
      toast.error('Failed to check MFA status');
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setProcessing(true);
    try {
      const newSecret = MFAService.generateSecret();
      const otpUrl = MFAService.generateQRCode(user.email, newSecret, 'Customer Portal');
      const qrCodeImage = await MFAService.generateQRCodeImage(otpUrl);
      
      setSecret(newSecret);
      setQrCode(qrCodeImage);
      toast.success('QR code generated! Scan with your authenticator app');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setProcessing(false);
    }
  };

  const enableMFA = async () => {
    if (!user || !secret || !verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setProcessing(true);
    try {
      const isValid = MFAService.verifyToken(secret, verificationCode);
      
      if (!isValid) {
        toast.error('Invalid verification code. Please try again.');
        return;
      }

      await MFAService.enableMFA(user.id, secret);
      
      const codes = MFAService.generateBackupCodes();
      await MFAService.storeBackupCodes(user.id, codes);
      setBackupCodes(codes);
      setMfaEnabled(true);
      
      toast.success('Two-factor authentication enabled successfully!');
    } catch (error) {
      console.error('Error enabling MFA:', error);
      toast.error('Failed to enable MFA. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const disableMFA = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      await MFAService.disableMFA(user.id);
      setMfaEnabled(false);
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      setBackupCodes([]);
      toast.success('Two-factor authentication disabled');
    } catch (error) {
      console.error('Error disabling MFA:', error);
      toast.error('Failed to disable MFA');
    } finally {
      setProcessing(false);
    }
  };

  const generateNewBackupCodes = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      await MFAService.disableMFA(user.id);
      
      const newSecret = MFAService.generateSecret();
      await MFAService.enableMFA(user.id, newSecret);
      
      const codes = MFAService.generateBackupCodes();
      await MFAService.storeBackupCodes(user.id, codes);
      setBackupCodes(codes);
      
      toast.success('New backup codes generated');
    } catch (error) {
      console.error('Error generating backup codes:', error);
      toast.error('Failed to generate backup codes');
    } finally {
      setProcessing(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadBackupCodes = () => {
    const text = `Customer Portal - Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup codes downloaded');
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-tl-border bg-background">
          <DialogHeader>
            <DialogTitle className="text-tl-text">Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-tl-border bg-background max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-tl-text">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription className="text-tl-muted-foreground">
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* MFA Status */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-tl-border bg-tl-muted/10">
            <div>
              <p className="font-medium text-tl-text">Status</p>
              <p className="text-sm text-tl-muted-foreground">
                {mfaEnabled ? 'Two-factor authentication is active' : 'Two-factor authentication is inactive'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              mfaEnabled 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            }`}>
              {mfaEnabled ? 'Active' : 'Inactive'}
            </div>
          </div>

          {!mfaEnabled ? (
            // Setup Flow
            <>
              {!qrCode ? (
                <div className="space-y-4">
                  <p className="text-sm text-tl-muted-foreground">
                    Protect your account by requiring a verification code in addition to your password when signing in.
                  </p>
                  <Button 
                    onClick={generateQRCode} 
                    disabled={processing}
                    className="w-full"
                  >
                    Setup Two-Factor Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mobile Alert */}
                  {isMobile && (
                    <Alert className="border-primary/50 bg-primary/5">
                      <Smartphone className="h-4 w-4" />
                      <AlertTitle>Setting up on mobile?</AlertTitle>
                      <AlertDescription>
                        Use the manual entry method below since you can't scan a QR code on the same device.
                      </AlertDescription>
                    </Alert>
                  )}

                  {isMobile ? (
                    // Mobile: Show Manual Entry FIRST
                    <>
                      {/* Manual Entry Section - Enhanced for Mobile */}
                      <div className="space-y-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                            1
                          </div>
                          <h4 className="font-semibold text-lg">Manual Entry Setup</h4>
                        </div>
                        
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">Step-by-step instructions:</p>
                          <ol className="list-decimal list-inside space-y-1.5 ml-2">
                            <li>Download an authenticator app:
                              <ul className="list-disc list-inside ml-6 mt-1 space-y-0.5">
                                <li>Google Authenticator (iOS/Android)</li>
                                <li>Microsoft Authenticator (iOS/Android)</li>
                                <li>Authy (iOS/Android)</li>
                              </ul>
                            </li>
                            <li>Open the app and tap "Add Account" or "+"</li>
                            <li>Select "Enter a setup key" or "Manual entry"</li>
                            <li>Copy the secret key below and paste it</li>
                            <li>Name it "Customer Portal"</li>
                            <li>Enter the 6-digit code shown in the app</li>
                          </ol>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Secret Key</Label>
                          <div 
                            className="flex items-center gap-2 p-4 bg-background rounded-lg border-2 border-border hover:border-primary transition-colors cursor-pointer active:scale-[0.99]"
                            onClick={() => copyCode(secret)}
                          >
                            <code className="flex-1 text-base font-mono break-all select-all">
                              {secret}
                            </code>
                            <Button size="sm" variant="ghost" className="shrink-0">
                              {copiedCode === secret ? (
                                <Check className="h-5 w-5 text-green-500" />
                              ) : (
                                <Copy className="h-5 w-5" />
                              )}
                            </Button>
                          </div>
                          {copiedCode === secret && (
                            <p className="text-sm text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                              <Check className="h-4 w-4" />
                              Copied! Now paste it in your authenticator app
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            💡 Tap the box above to copy the secret key
                          </p>
                        </div>
                      </div>

                      {/* QR Code Section - Secondary for Mobile */}
                      <div className="space-y-4 opacity-60">
                        <div>
                          <h4 className="font-medium text-tl-text mb-2">Alternative: Scan QR Code</h4>
                          <p className="text-sm text-tl-muted-foreground mb-4">
                            If viewing on a different device, you can scan this QR code
                          </p>
                        </div>
                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                      </div>
                    </>
                  ) : (
                    // Desktop: Show QR Code FIRST
                    <>
                      {/* QR Code Section */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-tl-text mb-2">Step 1: Scan QR Code</h4>
                          <p className="text-sm text-tl-muted-foreground mb-4">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                          </p>
                        </div>
                        <div className="flex justify-center p-4 bg-white rounded-lg">
                          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                      </div>

                      {/* Manual Entry Section */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-tl-text">Or enter manually:</h4>
                        <div className="flex items-center gap-2 p-3 bg-tl-muted/10 rounded-lg border border-tl-border">
                          <code className="flex-1 text-sm font-mono text-tl-text break-all">{secret}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyCode(secret)}
                          >
                            {copiedCode === secret ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {copiedCode === secret && (
                          <p className="text-sm text-green-600 dark:text-green-400">
                            ✓ Secret key copied to clipboard
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Verification */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-tl-text mb-2">Step 2: Verify</h4>
                      <p className="text-sm text-tl-muted-foreground mb-4">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="text-center text-2xl tracking-widest font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={enableMFA}
                        disabled={processing || verificationCode.length !== 6}
                        className="flex-1"
                      >
                        Verify & Enable
                      </Button>
                      <Button
                        onClick={() => {
                          setQrCode('');
                          setSecret('');
                          setVerificationCode('');
                        }}
                        variant="outline"
                        disabled={processing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Enabled State
            <div className="space-y-4">
              {backupCodes.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-tl-text mb-2">Backup Codes</h4>
                    <p className="text-sm text-tl-muted-foreground mb-4">
                      Save these backup codes in a safe place. Each code can only be used once.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-tl-muted/10 rounded border border-tl-border"
                      >
                        <code className="flex-1 text-sm font-mono text-tl-text">{code}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyCode(code)}
                        >
                          {copiedCode === code ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button onClick={downloadBackupCodes} variant="outline" className="w-full">
                    Download Backup Codes
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <Button 
                  onClick={generateNewBackupCodes} 
                  variant="outline"
                  disabled={processing}
                  className="w-full"
                >
                  Generate New Backup Codes
                </Button>
                <Button 
                  onClick={disableMFA} 
                  variant="destructive"
                  disabled={processing}
                  className="w-full"
                >
                  Disable Two-Factor Authentication
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
