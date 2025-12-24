import { LucideIcon, Home, Package, Info, UserCircle, ShoppingCart, FileText, MoreHorizontal, LogIn } from 'lucide-react';

export interface MobileTab {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: () => number;
  requiresAuth?: boolean;
  hideWhenAuth?: boolean;
}

export const MOBILE_TABS: MobileTab[] = [
  {
    label: 'Home',
    path: '/hub',
    icon: Home,
    requiresAuth: false
  },
  {
    label: 'Products',
    path: '/products',
    icon: Package,
    requiresAuth: false
  },
  {
    label: 'About',
    path: '/about',
    icon: Info,
    requiresAuth: false
  },
  {
    label: 'Sign In',
    path: '/portal-auth',
    icon: LogIn,
    requiresAuth: false,
    hideWhenAuth: true
  },
  {
    label: 'Portal',
    path: '/portal',
    icon: UserCircle,
    requiresAuth: true
  }
];

export const MOBILE_PORTAL_TABS: MobileTab[] = [
  {
    label: 'Home',
    path: '/portal',
    icon: Home,
    requiresAuth: true
  },
  {
    label: 'Catalog',
    path: '/portal/catalog',
    icon: Package,
    requiresAuth: true
  },
  {
    label: 'Cart',
    path: '/portal/cart',
    icon: ShoppingCart,
    requiresAuth: true
  },
  {
    label: 'Orders',
    path: '/portal/orders',
    icon: FileText,
    requiresAuth: true
  }
];
