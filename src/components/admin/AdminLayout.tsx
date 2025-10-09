import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { SidebarProvider } from '@/components/ui/sidebar';
import { RealtimeIndicator } from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';

export const AdminLayout: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { isSyncing } = useBackgroundSync();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
          <div className="fixed top-8 right-4 z-50">
            <RealtimeIndicator isSyncing={isSyncing} />
          </div>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </SidebarProvider>
  );
};
