import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { HelpButton } from '@/components/customer/help/HelpButton';
import { mobileFeatures } from '@/config/mobile.config';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen 
                    bg-gradient-to-b from-[#F9FBFF] via-[#F4F7FB] to-[#EAF1FF] 
                    dark:from-[#0A1320] dark:to-[#0E1929]
                    safe-top safe-bottom overflow-x-hidden">
      <CustomerNavigation />
      <main className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
        <Outlet />
      </main>
      {mobileFeatures.showPWAInstallPrompt && <PWAInstallPrompt />}
      <HelpButton />
    </div>
  );
};