import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, ShoppingCart, FileText, UserCircle, MessageSquare, MapPin, Calendar } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/portal', icon: Home },
  { label: 'Catalog', path: '/portal/catalog', icon: Package },
  { label: 'Cart', path: '/portal/cart', icon: ShoppingCart },
  { label: 'Quotes', path: '/portal/quotes', icon: FileText },
  { label: 'Orders', path: '/portal/orders', icon: ShoppingCart },
  { label: 'Subscriptions', path: '/portal/subscriptions', icon: Calendar },
  { label: 'Addresses', path: '/portal/addresses', icon: MapPin },
  { label: 'Profile', path: '/portal/profile', icon: UserCircle },
];

export const TabletPillNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav 
      className="hidden sm:flex lg:hidden 
                 gap-2 
                 overflow-x-auto scrollbar-hide
                 py-2 px-4 sm:px-0
                 -mx-4 sm:mx-0
                 mb-4 sm:mb-5"
      role="navigation"
      aria-label="Tablet navigation"
    >
      <div className="flex gap-2 min-w-max px-4 sm:px-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/portal' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2
                          px-4 py-2
                          rounded-full
                          text-sm font-medium
                          transition-all duration-200
                          focus-maritime
                          whitespace-nowrap
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-[#0077B6] to-[#003366] text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
