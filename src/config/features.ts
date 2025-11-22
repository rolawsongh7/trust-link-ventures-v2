/**
 * Feature flags configuration
 * Controls which features are enabled based on environment
 */

const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.MODE === 'production';

export const FEATURES = {
  // Development features (disabled in production)
  enableDebugMode: isDevelopment,
  enableConsoleLogging: isDevelopment,
  enableDevTools: isDevelopment,
  enablePerformanceMonitoring: isDevelopment,
  
  // Production features
  enableAnalytics: isProduction,
  enableErrorReporting: isProduction,
  enableSecurityAuditing: isProduction,
  
  // API configuration
  enableMockAPI: false, // Never enable in production
  apiTimeout: isProduction ? 30000 : 60000,
  
  // Security features
  enableRateLimiting: true,
  enableCSRFProtection: true,
  enableXSSProtection: true,
  
  // Performance
  enableLazyLoading: isProduction,
  enableCodeSplitting: isProduction,
  enableCaching: isProduction,
} as const;

export type FeatureFlags = typeof FEATURES;

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return Boolean(FEATURES[feature]);
};

/**
 * Development mode check
 */
export const isDevelopmentMode = (): boolean => {
  return FEATURES.enableDebugMode;
};

/**
 * Production mode check
 */
export const isProductionMode = (): boolean => {
  return !FEATURES.enableDebugMode;
};
