import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { MOBILE_TABS, MOBILE_PORTAL_TABS } from '@/config/mobile/routes';
import { isNativeApp } from '@/utils/env';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCustomerAuth();
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

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-w-[60px] touch-manipulation ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label={tab.label}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.badge && tab.badge() > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {tab.badge()}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
