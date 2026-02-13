import { Outlet } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';

export function PlatformLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <PlatformSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
