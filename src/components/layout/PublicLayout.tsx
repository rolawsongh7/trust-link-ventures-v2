import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import Footer from './Footer';
import { FloatingLoginButton } from '@/components/ui/FloatingLoginButton';
import { mobileFeatures } from '@/config/mobile.config';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
      {mobileFeatures.showFloatingLogin && <FloatingLoginButton />}
    </div>
  );
};