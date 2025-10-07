import React from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isOnline, isUpdateAvailable, installApp, updateApp } = usePWA();
  const [showPrompt, setShowPrompt] = React.useState(false);

  React.useEffect(() => {
    if (isInstallable && !isInstalled) {
      // Show prompt after 3 seconds
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  if (!showPrompt && !isUpdateAvailable) return null;

  return (
    <>
      {/* Install Prompt */}
      {showPrompt && isInstallable && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in sm:left-auto sm:right-4 sm:w-96">
          <Card className="border-2 border-primary shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Install App
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowPrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Install Trust Link Ventures for a faster, app-like experience
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button onClick={installApp} className="flex-1 touch-manipulation">
                <Download className="mr-2 h-4 w-4" />
                Install Now
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPrompt(false)}
                className="touch-manipulation"
              >
                Later
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Available */}
      {isUpdateAvailable && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in sm:left-auto sm:right-4 sm:w-96">
          <Alert className="border-2 border-primary">
            <RefreshCw className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>New version available</span>
              <Button size="sm" onClick={updateApp} className="ml-2 touch-manipulation">
                Update
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-fade-in sm:left-auto sm:right-4 sm:w-96">
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              You're offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
};
