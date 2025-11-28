import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { RealtimeIndicator } from '@/components/realtime/RealtimeIndicator';
import { HelpButton } from '@/components/customer/help/HelpButton';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { mobileFeatures } from '@/config/mobile.config';
import { useIsMobile } from '@/hooks/use-mobile';


export const CustomerLayout: React.FC = () => {
  const { isSyncing } = useBackgroundSync();

  return (
    <div className="min-h-screen 
                    bg-gradient-to-b from-[#F9FBFF] via-[#F4F7FB] to-[#EAF1FF] 
                    dark:from-[#0A1320] dark:to-[#0E1929]
                    safe-top safe-bottom overflow-x-hidden">
      <CustomerNavigation />
      <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-40">
        <RealtimeIndicator isSyncing={isSyncing} />
      </div>
      <main className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
        <Outlet />
      </main>
      {mobileFeatures.showPWAInstallPrompt && <PWAInstallPrompt />}
      <HelpButton />
    </div>
  );
};