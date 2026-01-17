import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image, Shield, Lock } from 'lucide-react';

interface PhotoPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onDeny: () => void;
}

export function PhotoPermissionModal({
  open,
  onOpenChange,
  onContinue,
  onDeny,
}: PhotoPermissionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Image className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Photo Library Access</DialogTitle>
          <DialogDescription className="text-center">
            Trust Link needs access to your photos to upload payment proof documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">We only access photos you select</p>
              <p className="text-xs text-muted-foreground">
                We never browse or scan your photo library
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Secure & encrypted</p>
              <p className="text-xs text-muted-foreground">
                Uploaded files are encrypted and stored securely
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You can change this anytime in your device Settings → Privacy → Photos
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onContinue} className="w-full">
            Continue
          </Button>
          <Button variant="ghost" onClick={onDeny} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
