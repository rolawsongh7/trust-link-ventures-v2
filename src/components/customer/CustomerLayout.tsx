import React from 'react';
import { Outlet } from 'react-router-dom';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';
import { FloatingLoginButton } from '@/components/ui/FloatingLoginButton';
import { FloatingNotificationButton } from '@/components/ui/FloatingNotificationButton';

export const CustomerLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <CustomerNavigation />
      <main className="py-6">
        <Outlet />
      </main>
      <FloatingLoginButton />
      <FloatingNotificationButton />
    </div>
  );
};