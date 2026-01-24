import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Fingerprint, Shield, Zap, Lock } from 'lucide-react';

interface BiometricPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biometricType?: string;
  onEnable: () => void;
  onSkip: () => void;
}

export function BiometricPermissionModal({
  open,
  onOpenChange,
  biometricType = 'Biometric',
  onEnable,
  onSkip,
}: BiometricPermissionModalProps) {
  const features = [
    {
      icon: Zap,
      title: 'Faster Login',
      description: 'Sign in instantly without typing passwords',
    },
    {
      icon: Shield,
      title: 'Enhanced Security',
      description: 'Your biometrics never leave your device',
    },
    {
      icon: Lock,
      title: 'Account Protection',
      description: 'Adds an extra layer of security to your account',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Fingerprint className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Enable {biometricType}</DialogTitle>
          <DialogDescription className="text-center">
            Use {biometricType} for quick and secure access to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-muted-foreground text-center pt-2">
            You can disable {biometricType} anytime in Settings → Security
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onEnable} className="w-full">
            Enable {biometricType}
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
