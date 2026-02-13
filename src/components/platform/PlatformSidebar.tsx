import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/platform/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/platform/tenants', icon: Building2, label: 'Tenants' },
  { to: '/platform/settings', icon: Settings, label: 'Settings' },
];

export function PlatformSidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col min-h-screen">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">Hesed</h1>
        <p className="text-xs text-muted-foreground mt-1">Platform Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
