/**
 * Mobile-specific feature flags and configuration
 * Controls behavior differences between web and native apps
 */

import { isNativeApp } from '@/utils/env';

export interface MobileFeatures {
  // UI Features
  showFloatingLogin: boolean;
  showFloatingNotifications: boolean;
  showPWAInstallPrompt: boolean;
  
  // Performance
  compressHeroOnMobile: boolean;
  useMobileTables: boolean;
  deferHeavyChartsOnMobile: boolean;
  lazyLoadImages: boolean;
  
  // UX
  enablePullToRefresh: boolean;
  enableSwipeGestures: boolean;
  autoPlayCarousels: boolean;
  
  // Native-specific
  useMobileBottomNav: boolean;
  enableBiometricAuth: boolean;
  enablePushNotifications: boolean;
  enableLocalNotifications: boolean;
}

const getDefaultFeatures = (): MobileFeatures => {
  const native = isNativeApp();
  
  return {
    // UI Features - hide floating buttons in native (use bottom nav instead)
    showFloatingLogin: !native,
    showFloatingNotifications: !native,
    showPWAInstallPrompt: !native,
    
    // Performance - always optimize for mobile
    compressHeroOnMobile: true,
    useMobileTables: true,
    deferHeavyChartsOnMobile: true,
    lazyLoadImages: true,
    
    // UX - native apps get enhanced features
    enablePullToRefresh: native,
    enableSwipeGestures: native,
    autoPlayCarousels: !native,
    
    // Native-specific
    useMobileBottomNav: native,
    enableBiometricAuth: native,
    enablePushNotifications: native,
    enableLocalNotifications: native,
  };
};

export const mobileFeatures = getDefaultFeatures();

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof MobileFeatures): boolean => {
  return mobileFeatures[feature];
};

/**
 * Runtime feature override (for testing)
 */
export const setFeature = (feature: keyof MobileFeatures, value: boolean): void => {
  mobileFeatures[feature] = value;
};
