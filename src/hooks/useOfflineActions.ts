import { useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useBackgroundSync } from './useBackgroundSync';
import { useToast } from './use-toast';

interface OfflineActionOptions {
  type: string;
  data: any;
  onOnline?: () => Promise<any>;
  offlineMessage?: string;
}

export function useOfflineActions() {
  const { isOnline, connectionQuality, checkConnection } = useNetworkStatus();
  const { addToQueue, queue, isSyncing, processQueue } = useBackgroundSync();
  const { toast } = useToast();

  const executeOrQueue = useCallback(
    async <T>(options: OfflineActionOptions): Promise<T | null> => {
      const { type, data, onOnline, offlineMessage } = options;

      // Double-check connection status
      const reallyOnline = await checkConnection();

      if (reallyOnline && onOnline) {
        try {
          return await onOnline();
        } catch (error: any) {
          // If it's a network error, queue it
          if (
            error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            error.message?.includes('Failed to fetch')
          ) {
            addToQueue({ type, data });
            toast({
              title: 'Saved Offline',
              description: offlineMessage || 'Your action will be synced when connection returns.',
            });
            return null;
          }
          throw error;
        }
      } else {
        // Offline - queue the action
        addToQueue({ type, data });
        toast({
          title: 'Saved Offline',
          description: offlineMessage || 'Your action will be synced when connection returns.',
        });
        return null;
      }
    },
    [addToQueue, checkConnection, toast]
  );

  const canPerformAction = useCallback(
    (requiresOnline: boolean = true): boolean => {
      if (!requiresOnline) return true;
      return isOnline;
    },
    [isOnline]
  );

  const getOfflineMessage = useCallback((): string => {
    if (!isOnline) {
      return 'You are offline. This action requires an internet connection.';
    }
    if (connectionQuality === 'slow') {
      return 'Your connection is slow. The action may take longer than usual.';
    }
    return '';
  }, [isOnline, connectionQuality]);

  return {
    isOnline,
    connectionQuality,
    isSyncing,
    pendingActions: queue.length,
    executeOrQueue,
    canPerformAction,
    getOfflineMessage,
    processQueue,
    checkConnection,
  };
}
