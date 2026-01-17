import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Package, FileText, Truck } from 'lucide-react';

interface NotificationPermissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
  onSkip: () => void;
}

export function NotificationPermissionModal({
  open,
  onOpenChange,
  onEnable,
  onSkip,
}: NotificationPermissionModalProps) {
  const features = [
    {
      icon: Package,
      title: 'Order Updates',
      description: 'Know when your order is confirmed',
    },
    {
      icon: Truck,
      title: 'Delivery Tracking',
      description: 'Real-time shipping updates',
    },
    {
      icon: FileText,
      title: 'Quote Responses',
      description: 'Get notified when quotes are ready',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">Stay Updated</DialogTitle>
          <DialogDescription className="text-center">
            Get notified about your orders, quotes, and deliveries.
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
            You can customize or disable notifications anytime in Settings
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onEnable} className="w-full">
            Enable Notifications
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
