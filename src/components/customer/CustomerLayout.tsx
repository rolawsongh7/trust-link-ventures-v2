import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';
import { FloatingLoginButton } from '@/components/ui/FloatingLoginButton';
import { FloatingNotificationButton } from '@/components/ui/FloatingNotificationButton';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { RealtimeIndicator } from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

export const CustomerLayout: React.FC = () => {
  const { isSyncing } = useBackgroundSync();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 safe-top safe-bottom">
      <CustomerNavigation />
      <div className="fixed top-20 right-4 z-40">
        <RealtimeIndicator isSyncing={isSyncing} />
      </div>
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
      <FloatingLoginButton />
      <FloatingNotificationButton />
      <PWAInstallPrompt />
    </div>
  );
};