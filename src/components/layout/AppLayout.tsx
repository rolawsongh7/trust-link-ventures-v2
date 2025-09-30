import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { CommandPalette } from './CommandPalette';
import Footer from './Footer';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export const AppLayout = () => {
  const { user, loading, session } = useAuth();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();

  // Validate session health
  useEffect(() => {
    const validateSession = async () => {
      if (user && !session) {
        console.warn('[AppLayout] User exists but no session, refreshing');
        // Session might be stale, let auth context handle it
      }
    };
    
    validateSession();
  }, [user, session]);

  // Redirect to login page if not authenticated
  if (!loading && !user) {
    console.log('[AppLayout] No user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't show sidebar on auth pages
  const isAuthPage = location.pathname.startsWith('/auth');
  const isCRMPage = location.pathname === '/crm';
  
  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <SidebarInset className="flex-1">
          <div className="flex flex-col min-h-screen">
            <AppHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
            
            <main className="flex-1 p-6">
              <Outlet />
            </main>
            
            {/* Remove footer from admin portal */}
          </div>
        </SidebarInset>
        
        <CommandPalette 
          open={commandPaletteOpen} 
          onOpenChange={setCommandPaletteOpen} 
        />
      </div>
    </SidebarProvider>
  );
};