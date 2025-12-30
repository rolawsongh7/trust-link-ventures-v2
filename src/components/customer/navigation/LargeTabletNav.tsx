import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  FileText, 
  UserCircle, 
  MessageSquare, 
  MapPin,
  Receipt
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

interface LargeTabletNavProps {
  cartItemsCount?: number;
  pendingOrdersCount?: number;
}

export const LargeTabletNav: React.FC<LargeTabletNavProps> = ({ 
  cartItemsCount = 0,
  pendingOrdersCount = 0
}) => {
  const location = useLocation();

  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/portal', icon: Home },
    { label: 'Catalog', path: '/portal/catalog', icon: Package },
    { label: 'Cart', path: '/portal/cart', icon: ShoppingCart, badge: cartItemsCount > 0 ? cartItemsCount : undefined },
    { label: 'Quotes', path: '/portal/quotes', icon: FileText },
    { label: 'Orders', path: '/portal/orders', icon: ShoppingCart, badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined, badgeVariant: 'destructive' },
    { label: 'Invoices', path: '/portal/invoices', icon: Receipt },
    { label: 'Addresses', path: '/portal/addresses', icon: MapPin },
    { label: 'Messages', path: '/portal/communications', icon: MessageSquare },
    { label: 'Profile', path: '/portal/profile', icon: UserCircle },
  ];

  return (
    <nav 
      className="hidden lg:flex xl:hidden 
                 gap-1.5
                 overflow-x-auto scrollbar-hide
                 py-2 px-4
                 -mx-4
                 mb-4"
      role="navigation"
      aria-label="Large tablet navigation"
    >
      <div className="flex gap-1.5 min-w-max px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path !== '/portal' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center gap-2
                          px-3 py-2.5
                          rounded-xl
                          text-sm font-medium
                          transition-all duration-200
                          focus-maritime
                          whitespace-nowrap
                          touch-manipulation
                          min-h-[44px]
                          ${
                            isActive
                              ? 'bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.8)] text-primary-foreground shadow-md'
                              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <Badge 
                  variant={item.badgeVariant || "destructive"}
                  className={`absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 text-xs flex items-center justify-center ${
                    item.badgeVariant === 'destructive' ? 'bg-orange-500 hover:bg-orange-600' : ''
                  }`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
