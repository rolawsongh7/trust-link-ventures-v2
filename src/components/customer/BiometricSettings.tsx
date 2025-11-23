import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Fingerprint, Smartphone, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBiometric } from '@/hooks/useBiometric';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Badge } from '@/components/ui/badge';
import { generateSessionFingerprint } from '@/lib/sessionFingerprint';

export const BiometricSettings = () => {
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  const { isAvailable, getBiometricType, authenticate } = useBiometric();
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolledAt, setEnrolledAt] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricSupport();
    loadBiometricSettings();
  }, [profile]);

  const checkBiometricSupport = async () => {
    const available = await isAvailable();
    setIsSupported(available);
    
    if (available) {
      const type = await getBiometricType();
      setBiometricType(type ? getReadableBiometricType(type) : null);
    }
    
    setLoading(false);
  };

  const loadBiometricSettings = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('customers')
      .select('biometric_enabled, biometric_enrolled_at')
      .eq('id', profile.id)
      .single();

    if (!error && data) {
      setBiometricEnabled(data.biometric_enabled || false);
      setEnrolledAt(data.biometric_enrolled_at);
    }
  };

  const getReadableBiometricType = (type: any): string => {
    const typeMap: Record<string, string> = {
      'face': 'Face ID',
      'fingerprint': 'Fingerprint',
      'iris': 'Iris Scanner',
      'touchId': 'Touch ID',
      'faceId': 'Face ID'
    };
    return typeMap[type] || 'Biometric';
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!profile?.id) return;

    if (enabled) {
      // Enable biometric - require authentication first
      const result = await authenticate('Verify your identity to enable biometric login');
      
      if (!result.authenticated) {
        toast({
          title: 'Authentication Failed',
          description: result.error || 'Could not verify your identity',
          variant: 'destructive',
        });
        return;
      }

      // Get device fingerprint
      const fingerprint = await generateSessionFingerprint();

      // Save to database
      const { error } = await supabase
        .from('customers')
        .update({
          biometric_enabled: true,
          biometric_enrolled_at: new Date().toISOString(),
          biometric_device_id: fingerprint.deviceId,
        })
        .eq('id', profile.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to enable biometric authentication',
          variant: 'destructive',
        });
        return;
      }

      setBiometricEnabled(true);
      setEnrolledAt(new Date().toISOString());
      toast({
        title: 'Biometric Enabled',
        description: `${biometricType} authentication is now required for login`,
      });
    } else {
      // Disable biometric - require current authentication first
      const result = await authenticate('Verify your identity to disable biometric login');
      
      if (!result.authenticated) {
        toast({
          title: 'Authentication Failed',
          description: result.error || 'Could not verify your identity',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('customers')
        .update({
          biometric_enabled: false,
          biometric_enrolled_at: null,
          biometric_device_id: null,
        })
        .eq('id', profile.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to disable biometric authentication',
          variant: 'destructive',
        });
        return;
      }

      setBiometricEnabled(false);
      setEnrolledAt(null);
      toast({
        title: 'Biometric Disabled',
        description: 'Password-only authentication will be used for login',
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Biometric Authentication</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Use {biometricType || 'biometric authentication'} to securely access your account
          </p>
        </div>
        
        {!isSupported && (
          <Badge variant="secondary" className="gap-1">
            <Smartphone className="h-3 w-3" />
            Web Only
          </Badge>
        )}
      </div>

      {!isSupported ? (
        <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-medium">Not Available</p>
            <p className="text-muted-foreground">
              Biometric authentication is only available on mobile devices with the native app installed.
              Install the app to use Face ID or fingerprint login.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Enable {biometricType} Login</p>
                <p className="text-sm text-muted-foreground">
                  {biometricEnabled 
                    ? `Enrolled on ${new Date(enrolledAt!).toLocaleDateString()}`
                    : 'Require biometric verification for account access'
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={biometricEnabled}
              onCheckedChange={handleToggleBiometric}
            />
          </div>

          {biometricEnabled && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-primary">Enhanced Security Active</p>
                  <p className="text-muted-foreground">
                    Your account is protected with {biometricType} authentication. 
                    You'll be prompted to verify your identity when signing in from this device.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
