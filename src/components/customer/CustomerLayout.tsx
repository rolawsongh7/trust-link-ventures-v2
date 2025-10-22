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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 safe-top safe-bottom overflow-x-hidden">
      <CustomerNavigation />
      <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-40">
        <RealtimeIndicator isSyncing={isSyncing} />
      </div>
      <main className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
        <Outlet />
      </main>
      <FloatingLoginButton />
      <FloatingNotificationButton />
      <PWAInstallPrompt />
    </div>
  );
};