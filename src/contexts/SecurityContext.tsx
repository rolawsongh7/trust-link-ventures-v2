import React, { createContext, useContext, useEffect, useState } from 'react';
import { RateLimiter, setupCSPReporting, logSecurityEvent } from '@/lib/security';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityContextType {
  rateLimiter: RateLimiter;
  isRateLimited: (identifier: string, maxAttempts?: number, windowMs?: number) => boolean;
  logEvent: (eventType: string, eventData?: Record<string, any>, severity?: 'low' | 'medium' | 'high' | 'critical') => Promise<void>;
  checkPermission: (permission: string) => boolean;
  enforceCSP: boolean;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
  enforceCSP?: boolean;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ 
  children, 
  enforceCSP = true 
}) => {
  const { user } = useAuth();
  const [rateLimiter] = useState(() => new RateLimiter());

  useEffect(() => {
    // Setup CSP violation reporting
    if (enforceCSP) {
      setupCSPReporting();
    }

    // Log user session start
    if (user) {
      logSecurityEvent('session_start', { userId: user.id }, 'low');
    }

    // Cleanup function
    return () => {
      if (user) {
        logSecurityEvent('session_end', { userId: user.id }, 'low');
      }
    };
  }, [user, enforceCSP]);

  const isRateLimited = (identifier: string, maxAttempts = 5, windowMs = 60000): boolean => {
    const limited = rateLimiter.isRateLimited(identifier, maxAttempts, windowMs);
    
    if (limited) {
      logSecurityEvent('rate_limit_exceeded', {
        identifier,
        maxAttempts,
        windowMs,
        userId: user?.id
      }, 'medium');
    }
    
    return limited;
  };

  const logEvent = async (
    eventType: string, 
    eventData?: Record<string, any>, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    await logSecurityEvent(eventType, {
      ...eventData,
      userId: user?.id,
      timestamp: new Date().toISOString()
    }, severity);
  };

  const checkPermission = (permission: string): boolean => {
    // Implementation would depend on your permission system
    // This is a placeholder that always returns true for authenticated users
    if (!user) return false;
    
    // You could extend this to check user roles, permissions, etc.
    return true;
  };

  const value: SecurityContextType = {
    rateLimiter,
    isRateLimited,
    logEvent,
    checkPermission,
    enforceCSP
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

// HOC for protecting components with security checks
export const withSecurity = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: string,
  rateLimitKey?: string
) => {
  return (props: P) => {
    const { checkPermission, isRateLimited, logEvent } = useSecurityContext();
    const { user } = useAuth();

    useEffect(() => {
      if (rateLimitKey && user) {
        const identifier = `${user.id}-${rateLimitKey}`;
        if (isRateLimited(identifier)) {
          logEvent('component_access_rate_limited', {
            component: Component.displayName || Component.name,
            rateLimitKey,
            userId: user.id
          }, 'medium');
        }
      }
    }, [user, rateLimitKey, isRateLimited, logEvent]);

    // Check permissions
    if (requiredPermission && !checkPermission(requiredPermission)) {
      logEvent('unauthorized_component_access', {
        component: Component.displayName || Component.name,
        requiredPermission,
        userId: user?.id
      }, 'high');

      return (
        <div className="p-4 text-center">
          <p className="text-destructive">Access denied. Insufficient permissions.</p>
        </div>
      );
    }

    // Check rate limiting
    if (rateLimitKey && user) {
      const identifier = `${user.id}-${rateLimitKey}`;
      if (isRateLimited(identifier)) {
        return (
          <div className="p-4 text-center">
            <p className="text-warning">Rate limit exceeded. Please try again later.</p>
          </div>
        );
      }
    }

    return <Component {...props} />;
  };
};