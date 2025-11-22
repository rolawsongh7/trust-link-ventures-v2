import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { usePendingAddressRequests } from '@/hooks/usePendingAddressRequests';
import { MOBILE_TABS, MOBILE_PORTAL_TABS } from '@/config/mobile/routes';
import { isNativeApp } from '@/utils/env';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCustomerAuth();
  const { totalItems } = useShoppingCart();
  const { pendingCount } = usePendingAddressRequests();
  const native = isNativeApp();

  // Only show in native apps
  if (!native) return null;

  // Choose tab set based on authentication and current route
  const isInPortal = location.pathname.startsWith('/portal');
  const tabs = (user && isInPortal) ? MOBILE_PORTAL_TABS : MOBILE_TABS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || 
                          (tab.path !== '/' && location.pathname.startsWith(tab.path));

          // Hide auth-required tabs if not logged in
          if (tab.requiresAuth && !user) return null;

          // Calculate dynamic badge count
          const getBadgeCount = () => {
            if (tab.path === '/portal/cart') return totalItems;
            if (tab.path === '/portal/orders') return pendingCount;
            return tab.badge ? tab.badge() : 0;
          };

          const badgeCount = getBadgeCount();

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-[60px] touch-manipulation relative ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
              {badgeCount > 0 && (
                <span className="absolute top-2 right-[calc(50%-20px)] bg-destructive text-destructive-foreground text-xs rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center font-semibold">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
