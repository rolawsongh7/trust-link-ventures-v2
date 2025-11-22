/**
 * Intelligent Route Preloading Strategy
 * Preloads routes based on user behavior to improve perceived performance
 */

import { preloadRoute } from './lazyRoute';

// Cache for preloaded routes
const preloadedRoutes = new Set<string>();

/**
 * Preload a route component
 */
export function preloadRouteComponent(Component: any, routePath: string) {
  // Don't preload if already preloaded
  if (preloadedRoutes.has(routePath)) {
    return;
  }

  console.log('[Preload] Preloading route:', routePath);
  preloadRoute(Component);
  preloadedRoutes.add(routePath);
}

/**
 * Preload route on link hover (desktop)
 */
export function usePreloadOnHover(Component: any, routePath: string) {
  return {
    onMouseEnter: () => {
      if (window.innerWidth >= 768) { // Only on desktop
        preloadRouteComponent(Component, routePath);
      }
    },
  };
}

/**
 * Preload route on touch start (mobile)
 */
export function usePreloadOnTouch(Component: any, routePath: string) {
  return {
    onTouchStart: () => {
      preloadRouteComponent(Component, routePath);
    },
  };
}

/**
 * Preload likely next routes based on current location
 */
export function preloadLikelyRoutes(
  currentPath: string,
  routeComponents: Record<string, any>
) {
  const predictions: Record<string, string[]> = {
    // Admin routes
    '/admin/dashboard': ['customers', 'quotes', 'orders'],
    '/admin/customers': ['crm', 'leads', 'quotes'],
    '/admin/quotes': ['customers', 'orders'],
    '/admin/orders': ['quotes', 'invoices'],

    // Customer routes
    '/portal': ['catalog', 'quotes', 'orders'],
    '/portal/catalog': ['cart', 'quotes'],
    '/portal/cart': ['quotes', 'orders'],
    '/portal/quotes': ['orders', 'catalog'],
    '/portal/orders': ['quotes', 'invoices'],
  };

  const likelyNext = predictions[currentPath] || [];

  likelyNext.forEach((route) => {
    const Component = routeComponents[route];
    if (Component) {
      setTimeout(() => {
        preloadRouteComponent(Component, route);
      }, 1000); // Preload after 1 second
    }
  });
}

/**
 * Preload critical routes immediately
 */
export function preloadCriticalRoutes(routeComponents: Record<string, any>) {
  const critical = [
    'catalog',
    'cart',
    'quotes',
    'orders',
  ];

  critical.forEach((route) => {
    const Component = routeComponents[route];
    if (Component) {
      setTimeout(() => {
        preloadRouteComponent(Component, route);
      }, 2000); // Preload after 2 seconds
    }
  });
}

/**
 * Prefetch API data for a route
 */
export async function prefetchRouteData(routePath: string, queryClient: any) {
  const prefetchMap: Record<string, () => Promise<void>> = {
    '/portal/quotes': async () => {
      // Prefetch quotes data
      console.log('[Prefetch] Prefetching quotes data');
      // Implementation in Phase 5
    },
    '/portal/orders': async () => {
      // Prefetch orders data
      console.log('[Prefetch] Prefetching orders data');
      // Implementation in Phase 5
    },
    '/admin/dashboard': async () => {
      // Prefetch dashboard data
      console.log('[Prefetch] Prefetching dashboard data');
      // Implementation in Phase 5
    },
  };

  const prefetchFn = prefetchMap[routePath];
  if (prefetchFn) {
    await prefetchFn();
  }
}
