import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

export const FloatingNotificationButton: React.FC = () => {
  const { user } = useCustomerAuth();
  const [hasUnread] = useState(true); // Placeholder for unread notifications
  
  // Only show for logged-in customers
  if (!user) {
    return null;
  }

  const handleNotificationClick = () => {
    // Handle notification click - could open a dropdown or navigate to notifications page
    console.log('Notifications clicked');
  };

  return (
    <div className="fixed z-50 pointer-events-auto
                    bottom-20 right-6
                    sm:bottom-24 sm:right-6
                    [.has-bottom-nav_&]:bottom-[calc(4rem+env(safe-area-inset-bottom)+5rem)]
                    pb-safe">
      <button
        onClick={handleNotificationClick}
        className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-md
                   border border-white/20 shadow-xl hover:shadow-2xl
                   p-4 min-h-[44px] min-w-[44px] transition-all duration-300 hover:scale-105
                   hover:bg-white/20 active:scale-95
                   before:absolute before:inset-0 before:rounded-2xl
                   before:bg-gradient-to-r before:from-primary/20 before:via-secondary/20 before:to-accent/20
                   before:opacity-0 before:transition-opacity before:duration-300
                   hover:before:opacity-100"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
          borderImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.1)) 1',
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.025em'
        }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent
                       group-hover:translate-x-full transition-transform duration-1000 ease-out" />
        
        {/* Ripple effect container */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-active:scale-100 
                         transition-transform duration-200 ease-out opacity-50" 
               style={{ transformOrigin: 'center' }} />
        </div>
        
        {/* Bell icon */}
        <div className="relative">
          <Bell className="w-6 h-6 text-white transition-transform group-hover:rotate-12" />
          
          {/* Notification dot */}
          {hasUnread && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full 
                           animate-pulse border-2 border-white/20" />
          )}
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 
                       opacity-0 group-hover:opacity-50 transition-opacity duration-300 blur-xl -z-10" />
      </button>
    </div>
  );
};