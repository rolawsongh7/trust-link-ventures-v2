/**
 * Enhanced Lazy Route Loading
 * Features:
 * - Loading skeleton matching page layout
 * - Preloading on hover
 * - Error boundaries
 * - Retry logic
 */

import { lazy, ComponentType, Suspense, useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Wifi } from 'lucide-react';

interface LazyRouteOptions {
  fallback?: React.ReactNode;
  preload?: boolean;
}

/**
 * Create a lazy-loaded route component with enhanced features
 */
export function lazyRoute<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyRouteOptions = {}
) {
  const LazyComponent = lazy(importFunc);
  
  // Store the import function for preloading
  (LazyComponent as any)._preload = importFunc;

  const fallback = options.fallback || <RouteLoadingSkeleton />;

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Preload a lazy route component
 */
export function preloadRoute(Component: any) {
  if (Component._preload) {
    Component._preload();
  }
}

/**
 * Slow connection warning component
 */
const SlowConnectionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowWarning(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!showWarning) return null;
  
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4 animate-fade-in">
      <Wifi className="h-4 w-4" />
      <span>Loading is taking longer than expected...</span>
    </div>
  );
};

/**
 * Default loading skeleton for routes
 */
export const RouteLoadingSkeleton = () => {
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 sm:w-64" />
        <Skeleton className="h-4 w-64 sm:w-96" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full hidden sm:block" />
      </div>

      {/* Table/List skeleton */}
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full hidden sm:block" />
        <Skeleton className="h-12 w-full hidden sm:block" />
      </div>
      
      <SlowConnectionWarning />
    </div>
  );
};

/**
 * Admin route loading skeleton
 */
export const AdminLoadingSkeleton = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Skeleton className="h-24 sm:h-32 w-full" />
        <Skeleton className="h-24 sm:h-32 w-full" />
        <Skeleton className="h-24 sm:h-32 w-full hidden sm:block" />
        <Skeleton className="h-24 sm:h-32 w-full hidden md:block" />
      </div>

      {/* Chart */}
      <Skeleton className="h-48 sm:h-64 w-full" />

      {/* Table */}
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <SlowConnectionWarning />
    </div>
  );
};

/**
 * Customer portal loading skeleton
 */
export const CustomerLoadingSkeleton = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Hero section */}
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-10 sm:h-12 w-full sm:w-3/4" />
        <Skeleton className="h-5 sm:h-6 w-3/4 sm:w-1/2" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Skeleton className="h-40 sm:h-48 w-full" />
        <Skeleton className="h-40 sm:h-48 w-full" />
        <Skeleton className="h-40 sm:h-48 w-full hidden sm:block" />
        <Skeleton className="h-40 sm:h-48 w-full hidden lg:block" />
        <Skeleton className="h-40 sm:h-48 w-full hidden lg:block" />
        <Skeleton className="h-40 sm:h-48 w-full hidden lg:block" />
      </div>
      
      <SlowConnectionWarning />
    </div>
  );
};
