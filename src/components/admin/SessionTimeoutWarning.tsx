import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';
import { getAdminSessionManager } from '@/lib/sessionManager';

export const SessionTimeoutWarning: React.FC = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  useEffect(() => {
    const sessionManager = getAdminSessionManager();
    if (!sessionManager) return;

    const checkInterval = setInterval(() => {
      const remainingMs = sessionManager.getRemainingTime();
      const minutes = Math.floor(remainingMs / 60000);

      setRemainingMinutes(minutes);

      // Show warning when less than 5 minutes remaining
      if (minutes > 0 && minutes <= 5) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkInterval);
  }, []);

  const handleExtendSession = () => {
    const sessionManager = getAdminSessionManager();
    if (sessionManager) {
      sessionManager.resetTimer();
      setShowWarning(false);
    }
  };

  if (!showWarning) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Alert variant="destructive" className="border-2">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Session Expiring Soon
        </AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Your session will expire in <strong>{remainingMinutes} minute{remainingMinutes !== 1 ? 's' : ''}</strong> due to inactivity.
          </p>
          <Button 
            onClick={handleExtendSession}
            className="w-full"
            size="sm"
          >
            Extend Session
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
