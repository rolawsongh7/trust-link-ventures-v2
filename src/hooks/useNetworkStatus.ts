import { useState, useEffect, useCallback } from 'react';

export type ConnectionQuality = 'good' | 'slow' | 'offline';

interface NetworkStatus {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

interface NetworkInformation extends EventTarget {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

export function useNetworkStatus(): NetworkStatus & {
  checkConnection: () => Promise<boolean>;
} {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionQuality: 'good',
    effectiveType: null,
    downlink: null,
    rtt: null,
  }));

  const getConnectionQuality = useCallback((): ConnectionQuality => {
    if (!navigator.onLine) return 'offline';

    const connection = navigator.connection;
    if (!connection) return 'good';

    const effectiveType = connection.effectiveType;
    const rtt = connection.rtt;

    // Determine quality based on connection type and RTT
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'slow';
    }
    if (rtt && rtt > 500) {
      return 'slow';
    }
    if (effectiveType === '3g' && rtt && rtt > 300) {
      return 'slow';
    }

    return 'good';
  }, []);

  const updateStatus = useCallback(() => {
    const connection = navigator.connection;
    setStatus({
      isOnline: navigator.onLine,
      connectionQuality: getConnectionQuality(),
      effectiveType: connection?.effectiveType || null,
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
    });
  }, [getConnectionQuality]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    try {
      // Try to fetch a small resource to verify actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/favicon.png', {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to connection changes if supported
    const connection = navigator.connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    // Initial status
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, [updateStatus]);

  return {
    ...status,
    checkConnection,
  };
}
