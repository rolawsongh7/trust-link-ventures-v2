import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RealtimeIndicatorProps {
  isSyncing?: boolean;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ isSyncing }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You're currently offline. Changes will sync when connection returns.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Syncing
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Syncing your changes...</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 border-green-500/20">
            <Wifi className="h-3 w-3" />
            Live
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Real-time updates enabled</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
