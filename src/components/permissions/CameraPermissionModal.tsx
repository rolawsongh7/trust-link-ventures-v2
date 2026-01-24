import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Receipt, AlertTriangle, Shield } from 'lucide-react';

interface CameraPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose?: 'payment' | 'issue' | 'general';
  onAllow: () => void;
  onDeny: () => void;
}

export function CameraPermissionModal({
  open,
  onOpenChange,
  purpose = 'general',
  onAllow,
  onDeny,
}: CameraPermissionModalProps) {
  const purposeContent = {
    payment: {
      title: 'Camera Access for Payment Proof',
      description: 'Take photos of payment receipts or bank transfer confirmations.',
      features: [
        {
          icon: Receipt,
          title: 'Capture Receipts',
          description: 'Photograph payment confirmations instantly',
        },
        {
          icon: Shield,
          title: 'Secure Upload',
          description: 'Photos are encrypted during transfer',
        },
      ],
    },
    issue: {
      title: 'Camera Access for Issue Reporting',
      description: 'Document delivery issues with photos for faster resolution.',
      features: [
        {
          icon: AlertTriangle,
          title: 'Document Issues',
          description: 'Capture damaged items or incorrect deliveries',
        },
        {
          icon: Shield,
          title: 'Evidence Protection',
          description: 'Photos are securely stored with your report',
        },
      ],
    },
    general: {
      title: 'Camera Access',
      description: 'Trust Link needs camera access to capture photos.',
      features: [
        {
          icon: Camera,
          title: 'Quick Capture',
          description: 'Take photos directly in the app',
        },
        {
          icon: Shield,
          title: 'Privacy First',
          description: 'We only access photos you explicitly take',
        },
      ],
    },
  };

  const content = purposeContent[purpose];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <DialogDescription className="text-center">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {content.features.map((feature) => {
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
            You can change camera permissions anytime in your device Settings
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onAllow} className="w-full">
            Allow Camera Access
          </Button>
          <Button variant="ghost" onClick={onDeny} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
