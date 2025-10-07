import React, { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

export const InstallBanner: React.FC = () => {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setIsDismissed(true);
  };

  const handleInstall = () => {
    installApp();
    handleDismiss();
  };

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary text-primary-foreground p-4 shadow-lg z-50 animate-slide-up safe-bottom">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Download className="h-5 w-5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">Install Trust Link Ventures</p>
            <p className="text-xs sm:text-sm opacity-90 truncate">Get our app for faster access and offline support</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button
            onClick={handleInstall}
            size="sm"
            variant="secondary"
            className="whitespace-nowrap touch-manipulation"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 touch-manipulation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
