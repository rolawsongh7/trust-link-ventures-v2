import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Package, ShoppingCart, FileText, UserCircle, MessageSquare, Clock, DollarSign, MapPin, Calendar } from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface DesktopSidebarProps {
  cartItemsCount?: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({ cartItemsCount = 0 }) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/portal', icon: Home },
    { label: 'Catalog', path: '/portal/catalog', icon: Package },
    { label: 'My Cart', path: '/portal/cart', icon: ShoppingCart, badge: cartItemsCount },
    { label: 'Quotes', path: '/portal/quotes', icon: FileText },
    { label: 'Orders', path: '/portal/orders', icon: ShoppingCart },
    { label: 'Addresses', path: '/portal/addresses', icon: MapPin },
    { label: 'Subscriptions', path: '/portal/subscriptions', icon: Calendar },
    { label: 'Communications', path: '/portal/communications', icon: MessageSquare },
    { label: 'Profile', path: '/portal/profile', icon: UserCircle },
  ];

  return (
    <aside 
      className="hidden xl:flex xl:flex-col 
                 xl:sticky xl:top-[80px] 
                 xl:h-[calc(100vh-80px)]
                 xl:w-64 
                 xl:pr-6
                 flex-shrink-0"
      role="navigation"
      aria-label="Desktop sidebar navigation"
    >
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/portal' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3
                          px-4 py-3
                          rounded-xl
                          text-sm font-medium
                          transition-all duration-200
                          focus-maritime
                          group
                          relative
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-[#0077B6] to-[#003366] text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/50'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`} />
              <span className="flex-1">{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="flex items-center justify-center
                                 min-w-[20px] h-5 px-1.5
                                 rounded-full
                                 bg-gradient-to-br from-rose-500 to-rose-600
                                 text-white
                                 text-xs font-bold
                                 shadow-sm">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
