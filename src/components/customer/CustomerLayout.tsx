import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { HelpButton } from '@/components/customer/help/HelpButton';
import { OnboardingWizard } from '@/components/customer/onboarding';
import { mobileFeatures } from '@/config/mobile.config';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { NotificationPermissionModal } from '@/components/permissions/NotificationPermissionModal';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const CustomerLayout: React.FC = () => {
  const {
    shouldPromptOnMount,
    showExplanationModal,
    onExplanationEnable,
    onExplanationSkip,
    closeExplanationModal,
    promptForPermission,
  } = useNotificationPermission();
  
  const { requestPermissions } = usePushNotifications();

  // Prompt for notifications after a delay on first visit
  useEffect(() => {
    if (shouldPromptOnMount) {
      promptForPermission();
    }
  }, [shouldPromptOnMount, promptForPermission]);

  const handleEnableNotifications = async () => {
    onExplanationEnable();
    await requestPermissions();
  };

  return (
    <div className="min-h-screen 
                    bg-gradient-to-b from-[#F9FBFF] via-[#F4F7FB] to-[#EAF1FF] 
                    dark:from-[#0A1320] dark:to-[#0E1929]
                    safe-top safe-bottom overflow-x-hidden">
      {/* Offline Banner */}
      <OfflineBanner />
      
      <CustomerNavigation />
      <main className="container mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-4 sm:py-6 max-w-full">
        <Outlet />
      </main>
      {mobileFeatures.showPWAInstallPrompt && <PWAInstallPrompt />}
      <HelpButton />
      
      {/* Onboarding Wizard - shows for new/incomplete users */}
      <OnboardingWizard />
      
      {/* Notification Permission Modal */}
      <NotificationPermissionModal
        open={showExplanationModal}
        onOpenChange={closeExplanationModal}
        onEnable={handleEnableNotifications}
        onSkip={onExplanationSkip}
      />
    </div>
  );
};