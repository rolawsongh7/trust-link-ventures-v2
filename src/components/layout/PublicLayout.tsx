import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import Footer from './Footer';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader onOpenCommandPalette={() => {}} />
      
      <main className="flex-1">
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
};