import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Package, 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  Building2
} from 'lucide-react';

export const SupplierNavigation: React.FC = () => {
  const location = useLocation();
  const { signOut } = useAuth();

  const navItems = [
    { href: '/supplier', label: 'Dashboard', icon: BarChart3 },
    { href: '/supplier/products', label: 'My Products', icon: Package },
    { href: '/supplier/orders', label: 'Orders', icon: FileText },
    { href: '/supplier/customers', label: 'Customers', icon: Users },
    { href: '/supplier/profile', label: 'Company Profile', icon: Building2 },
    { href: '/supplier/settings', label: 'Settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/supplier" className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Supplier Portal</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Sign Out */}
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-4">
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="w-full flex items-center space-x-2 justify-start"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};