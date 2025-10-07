import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface QueuedOperation {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

export const useBackgroundSync = () => {
  const { toast } = useToast();
  const [queue, setQueue] = useState<QueuedOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Back Online',
        description: 'Syncing pending changes...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You\'re Offline',
        description: 'Changes will sync when connection returns',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('sync-queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Error loading sync queue:', error);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sync-queue', JSON.stringify(queue));
  }, [queue]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, queue.length]);

  const addToQueue = (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retries'>) => {
    const newOperation: QueuedOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };

    setQueue((prev) => [...prev, newOperation]);

    if (isOnline) {
      processQueue();
    }
  };

  const processQueue = async () => {
    if (isSyncing || queue.length === 0) return;

    setIsSyncing(true);

    try {
      const operation = queue[0];
      
      // Process the operation based on type
      // This is where you'd implement your actual sync logic
      console.log('Processing queued operation:', operation);

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove from queue on success
      setQueue((prev) => prev.slice(1));
      
      toast({
        title: 'Synced',
        description: 'Changes synced successfully',
      });
    } catch (error) {
      console.error('Error processing queue:', error);
      
      // Retry logic
      setQueue((prev) => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0].retries += 1;
          
          // Remove if too many retries
          if (updated[0].retries >= 3) {
            toast({
              title: 'Sync Failed',
              description: 'Unable to sync changes after multiple attempts',
              variant: 'destructive',
            });
            return updated.slice(1);
          }
        }
        return updated;
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    localStorage.removeItem('sync-queue');
  };

  return {
    queue,
    isSyncing,
    isOnline,
    addToQueue,
    processQueue,
    clearQueue,
  };
};
