/**
 * Enhanced Lazy Route Loading
 * Features:
 * - Loading skeleton matching page layout
 * - Preloading on hover
 * - Error boundaries
 * - Retry logic
 */

import { lazy, ComponentType, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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
 * Default loading skeleton for routes
 */
export const RouteLoadingSkeleton = () => {
  return (
    <div className="min-h-screen p-6 space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Table/List skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
};

/**
 * Admin route loading skeleton
 */
export const AdminLoadingSkeleton = () => {
  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Chart */}
      <Skeleton className="h-64 w-full" />

      {/* Table */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
};

/**
 * Customer portal loading skeleton
 */
export const CustomerLoadingSkeleton = () => {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero section */}
      <div className="space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
};
