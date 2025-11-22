# Safety Implementation Guide: Phase 1 & 2

## Overview
This guide provides step-by-step instructions for implementing **Phase 1 (Console Audit)** and **Phase 2 (Keychain Integration)** - the two critical security fixes required for App Store approval.

**Total Time:** 7 hours (3 hours Phase 1 + 4 hours Phase 2)  
**Breaking Risk:** ❌ NONE - All changes are backward compatible

---

## Phase 1: Console Logging Audit & Sanitization

### 🎯 Goal
Remove all sensitive data from production console logs while maintaining debugging capability in development.

### 📋 Step-by-Step Implementation

#### Step 1.1: Create Production Logger Utility (30 minutes)

**File:** `src/lib/productionLogger.ts` (NEW FILE)

```typescript
/**
 * Production-safe logging utility
 * Prevents sensitive data exposure in production builds
 */

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

/**
 * Sanitize sensitive data from logs
 */
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'auth', 'sessionId', 'session_id',
    'creditCard', 'ssn', 'email', 'phone', 'address'
  ];
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Log levels with automatic sanitization
 */
export const safeLog = {
  /**
   * Info-level logs (development only)
   */
  info: (message: string, context?: LogContext) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, context ? sanitizeData(context) : '');
    }
  },

  /**
   * Warning-level logs (always shown, sanitized in production)
   */
  warn: (message: string, context?: LogContext) => {
    if (isProduction) {
      console.warn(`⚠️ ${message}`, context ? '[Details hidden in production]' : '');
    } else {
      console.warn(`⚠️ ${message}`, context);
    }
  },

  /**
   * Error-level logs (always shown, sanitized in production)
   */
  error: (message: string, error?: Error | any, context?: LogContext) => {
    if (isProduction) {
      // Only log error message, no stack traces or sensitive data
      console.error(`❌ ${message}`, error?.message || '[Error details hidden]');
    } else {
      console.error(`❌ ${message}`, error, context);
    }
  },

  /**
   * Debug-level logs (development only)
   */
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`🐛 ${message}`, data);
    }
  },

  /**
   * Security-related logs (NEVER to console, only to audit_logs table)
   */
  security: async (event: string, context?: LogContext) => {
    // Import here to avoid circular dependencies
    const { logSecurityEvent } = await import('./securityLogger');
    await logSecurityEvent(event, context);
  }
};

/**
 * Performance logging (development only)
 */
export const perfLog = {
  start: (label: string): (() => void) => {
    if (!isDevelopment) return () => {};
    
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    };
  }
};

/**
 * Deprecated console methods (use safeLog instead)
 */
if (isProduction) {
  // Override console methods in production
  const noop = () => {};
  (console as any).log = noop;
  (console as any).debug = noop;
  (console as any).info = noop;
  // Keep console.error and console.warn for critical issues
}
```

#### Step 1.2: Create Security Logger (15 minutes)

**File:** `src/lib/securityLogger.ts` (NEW FILE)

```typescript
/**
 * Security event logging to audit_logs table
 * Never logs to console - only to database
 */

import { supabase } from '@/integrations/supabase/client';

interface SecurityContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

export const logSecurityEvent = async (
  event: string, 
  context?: SecurityContext
) => {
  try {
    await supabase.from('audit_logs').insert({
      event_type: 'security_event',
      action: event,
      resource_type: 'security',
      event_data: {
        event,
        ...context,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        page_url: window.location.href,
      },
      severity: 'high',
    });
  } catch (error) {
    // Fail silently - don't expose to console
    // Could send to external monitoring service here
  }
};
```

#### Step 1.3: Replace Console Logs in Critical Files (2 hours)

**Priority Files to Update:**

##### 1.3.1: `src/components/admin/AdminProtectedRoute.tsx`

**Find and replace:**
```typescript
// ❌ BEFORE (Lines 45-59)
console.log('MFA Settings:', { data, error });
console.log('User email:', user?.email);
console.log('Checking MFA for admin user:', user?.email);
```

**Replace with:**
```typescript
// ✅ AFTER
import { safeLog } from '@/lib/productionLogger';

// Replace console.log calls
safeLog.debug('MFA Settings check', { hasData: !!data, hasError: !!error });
safeLog.debug('Admin user check', { userId: user?.id });
safeLog.info('Checking MFA status', { userId: user?.id });
```

##### 1.3.2: `src/pages/CustomerAuth.tsx`

**Find and replace:**
```typescript
// ❌ BEFORE
console.log('Sign in result:', result);
console.log('Error signing in:', error);
console.log('Session:', session);
```

**Replace with:**
```typescript
// ✅ AFTER
import { safeLog } from '@/lib/productionLogger';

safeLog.info('Sign in initiated', { component: 'CustomerAuth' });
safeLog.error('Sign in failed', error, { action: 'handleSignIn' });
safeLog.info('Session established', { userId: session?.user?.id });
```

##### 1.3.3: `src/pages/admin/QuoteRequestManagement.tsx`

**Find and replace:**
```typescript
// ❌ BEFORE (Lines 115, 126, 129)
console.log('User:', user);
console.log('Has admin access:', hasAdminAccess);
console.log('Loading states:', { isAuthLoading, isRoleLoading });
```

**Replace with:**
```typescript
// ✅ AFTER
import { safeLog } from '@/lib/productionLogger';

safeLog.debug('Auth check', { 
  hasUser: !!user, 
  hasAccess: hasAdminAccess 
});
safeLog.debug('Loading states', { 
  auth: isAuthLoading, 
  role: isRoleLoading 
});
```

##### 1.3.4: `src/pages/admin/InvoiceManagement.tsx`

**Find and replace:**
```typescript
// ❌ BEFORE (203+ lines with detailed logs)
console.log('Downloading invoice:', invoice);
console.log('Invoice data:', data);
console.log('PDF generated successfully');
```

**Replace with:**
```typescript
// ✅ AFTER
import { safeLog } from '@/lib/productionLogger';

safeLog.info('Invoice download initiated', { 
  invoiceId: invoice.id 
});
safeLog.info('Invoice data retrieved', { 
  itemCount: data?.items?.length 
});
safeLog.info('PDF generation complete');
```

##### 1.3.5: Payment Files (All)

**Files to update:**
- `src/pages/PaymentCallback.tsx`
- `src/components/orders/ConsolidatedQuoteAcceptanceDialog.tsx`
- `src/hooks/usePaymentVerification.ts`

**Find and replace:**
```typescript
// ❌ BEFORE
console.log('Payment reference:', reference);
console.log('Payment data:', paymentData);
console.log('Transaction result:', result);
```

**Replace with:**
```typescript
// ✅ AFTER
import { safeLog } from '@/lib/productionLogger';

safeLog.info('Payment verification started', { 
  hasReference: !!reference 
});
safeLog.info('Payment processing', { 
  status: paymentData?.status 
});
safeLog.info('Transaction completed', { 
  success: result?.success 
});
```

#### Step 1.4: Add ESLint Rule (15 minutes)

**File:** `.eslintrc.cjs` (UPDATE)

```javascript
module.exports = {
  // ... existing config
  rules: {
    // ... existing rules
    'no-console': ['error', { 
      allow: ['error', 'warn'] 
    }],
  },
};
```

#### Step 1.5: Update Build Configuration (15 minutes)

**File:** `vite.config.ts` (UPDATE)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
        drop_debugger: mode === 'production', // Remove debugger statements
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
      },
      mangle: {
        safari10: true, // iOS Safari compatibility
      },
    },
    sourcemap: mode !== 'production', // No source maps in production
  },
}));
```

### ✅ Phase 1 Testing Checklist

**Development Testing:**
```bash
# 1. Run development build
npm run dev

# 2. Check that logs appear in console
# 3. Verify sensitive data is sanitized
```

**Production Testing:**
```bash
# 1. Build production bundle
npm run build

# 2. Search for console.log in output
grep -r "console.log" dist/

# 3. Should return NO results

# 4. Check bundle size reduction
ls -lh dist/assets/*.js
```

**Manual Verification:**
- [ ] Login as customer - no email/password in console
- [ ] Login as admin - no session tokens in console
- [ ] Upload payment proof - no file data in console
- [ ] Process order - no payment amounts in console
- [ ] Check audit_logs table for security events

---

## Phase 2: iOS Keychain Integration

### 🎯 Goal
Store authentication tokens securely in iOS Keychain instead of localStorage.

### 📋 Step-by-Step Implementation

#### Step 2.1: Install Secure Storage Plugin (5 minutes)

```bash
npm install @capacitor-community/secure-storage
```

#### Step 2.2: Create Secure Storage Wrapper (45 minutes)

**File:** `src/lib/secureStorage.ts` (NEW FILE)

```typescript
/**
 * Secure storage wrapper for iOS Keychain and Android Keystore
 * Falls back to localStorage on web platforms
 */

import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from '@capacitor-community/secure-storage';

const isNative = Capacitor.isNativePlatform();

/**
 * Storage keys used by the application
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'supabase.auth.token',
  SESSION: 'supabase.auth.session',
  PAYMENT_REFERENCE: 'payment.reference',
  ORDER_ID: 'order.id',
  DEVICE_ID: 'device.id',
} as const;

/**
 * Secure storage interface matching Web Storage API
 */
class SecureStorage implements Storage {
  [name: string]: any;
  length: number = 0;

  /**
   * Set item in secure storage
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStoragePlugin.set({ key, value });
      } else {
        localStorage.setItem(key, value);
      }
      this.length = await this.getLength();
    } catch (error) {
      console.error('SecureStorage.setItem failed:', error);
      // Fallback to localStorage on error
      localStorage.setItem(key, value);
    }
  }

  /**
   * Get item from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (isNative) {
        const { value } = await SecureStoragePlugin.get({ key });
        return value;
      } else {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('SecureStorage.getItem failed:', error);
      // Fallback to localStorage on error
      return localStorage.getItem(key);
    }
  }

  /**
   * Remove item from secure storage
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStoragePlugin.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
      this.length = await this.getLength();
    } catch (error) {
      console.error('SecureStorage.removeItem failed:', error);
      // Fallback to localStorage on error
      localStorage.removeItem(key);
    }
  }

  /**
   * Clear all items from secure storage
   */
  async clear(): Promise<void> {
    try {
      if (isNative) {
        await SecureStoragePlugin.clear();
      } else {
        localStorage.clear();
      }
      this.length = 0;
    } catch (error) {
      console.error('SecureStorage.clear failed:', error);
      localStorage.clear();
    }
  }

  /**
   * Get key at index (not supported in native)
   */
  key(index: number): string | null {
    if (!isNative) {
      return localStorage.key(index);
    }
    return null;
  }

  /**
   * Get total number of items
   */
  private async getLength(): Promise<number> {
    if (!isNative) {
      return localStorage.length;
    }
    // Native doesn't provide length, return 0
    return 0;
  }
}

/**
 * Export singleton instance
 */
export const secureStorage = new SecureStorage();

/**
 * Helper function to migrate existing localStorage data to secure storage
 */
export const migrateToSecureStorage = async () => {
  if (!isNative) return; // Only needed on native platforms

  try {
    // Migrate Supabase auth data
    const authKeys = [
      'supabase.auth.token',
      'supabase.auth.session',
      'sb-ppyfrftmexvgnsxlhdbz-auth-token',
    ];

    for (const key of authKeys) {
      const value = localStorage.getItem(key);
      if (value) {
        await secureStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    }

    console.log('✅ Migration to secure storage complete');
  } catch (error) {
    console.error('❌ Migration to secure storage failed:', error);
  }
};
```

#### Step 2.3: Create Custom Supabase Storage Adapter (30 minutes)

**File:** `src/lib/supabaseStorage.ts` (NEW FILE)

```typescript
/**
 * Custom storage adapter for Supabase with secure storage support
 */

import { SupportedStorage } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

/**
 * Async storage adapter that works with Supabase's sync storage interface
 * Uses a caching layer to make async operations appear synchronous
 */
class SupabaseSecureStorageAdapter implements SupportedStorage {
  private cache: Map<string, string> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize cache from secure storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load Supabase auth keys into cache
      const authKeys = [
        'supabase.auth.token',
        'sb-ppyfrftmexvgnsxlhdbz-auth-token',
      ];

      for (const key of authKeys) {
        const value = await secureStorage.getItem(key);
        if (value) {
          this.cache.set(key, value);
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize secure storage adapter:', error);
    }
  }

  /**
   * Get item (synchronous interface required by Supabase)
   */
  getItem(key: string): string | null {
    return this.cache.get(key) || null;
  }

  /**
   * Set item (synchronous interface required by Supabase)
   */
  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    // Async write to secure storage (fire and forget)
    secureStorage.setItem(key, value).catch(error => {
      console.error('Failed to write to secure storage:', error);
    });
  }

  /**
   * Remove item (synchronous interface required by Supabase)
   */
  removeItem(key: string): void {
    this.cache.delete(key);
    // Async remove from secure storage (fire and forget)
    secureStorage.removeItem(key).catch(error => {
      console.error('Failed to remove from secure storage:', error);
    });
  }
}

export const supabaseStorageAdapter = new SupabaseSecureStorageAdapter();
```

#### Step 2.4: Update Supabase Client Configuration (30 minutes)

**File:** `src/integrations/supabase/client.ts` (UPDATE)

```typescript
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, checkSupabaseEnvironment } from '@/config/supabase';
import type { Database } from './types';
import { Capacitor } from '@capacitor/core';
import { supabaseStorageAdapter } from '@/lib/supabaseStorage';

// Validate configuration on module load
checkSupabaseEnvironment();

// Initialize storage adapter for native platforms
const isNative = Capacitor.isNativePlatform();
if (isNative) {
  // Initialize the adapter before creating client
  supabaseStorageAdapter.initialize();
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  SUPABASE_CONFIG.url, 
  SUPABASE_CONFIG.anonKey, 
  {
    auth: {
      storage: isNative ? supabaseStorageAdapter : localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isNative, // Only detect on web
      storageKey: 'supabase.auth.token',
    }
  }
);
```

#### Step 2.5: Update Payment Reference Storage (45 minutes)

**File:** `src/pages/PaymentCallback.tsx` (UPDATE)

```typescript
import { secureStorage } from '@/lib/secureStorage';

// ❌ BEFORE
const paymentRef = searchParams.get('reference') || 
  sessionStorage.getItem('paymentReference');
const orderId = searchParams.get('order_id') || 
  sessionStorage.getItem('orderId');

sessionStorage.setItem('paymentReference', reference);
sessionStorage.setItem('orderId', orderId);

// ✅ AFTER
const [paymentRef, setPaymentRef] = useState<string | null>(null);
const [orderId, setOrderId] = useState<string | null>(null);

useEffect(() => {
  const loadPaymentData = async () => {
    const ref = searchParams.get('reference') || 
      await secureStorage.getItem('paymentReference');
    const order = searchParams.get('order_id') || 
      await secureStorage.getItem('orderId');
    
    setPaymentRef(ref);
    setOrderId(order);
  };
  
  loadPaymentData();
}, [searchParams]);

// Save to secure storage
await secureStorage.setItem('paymentReference', reference);
await secureStorage.setItem('orderId', orderId);
```

**File:** `src/components/orders/ConsolidatedQuoteAcceptanceDialog.tsx` (UPDATE)

```typescript
import { secureStorage } from '@/lib/secureStorage';

// ❌ BEFORE
sessionStorage.setItem('paymentReference', data.reference);
sessionStorage.setItem('orderId', newOrder.id);

// ✅ AFTER
await secureStorage.setItem('paymentReference', data.reference);
await secureStorage.setItem('orderId', newOrder.id);
```

#### Step 2.6: Add Migration on App Launch (30 minutes)

**File:** `src/App.tsx` (UPDATE)

```typescript
import { useEffect } from 'react';
import { migrateToSecureStorage } from '@/lib/secureStorage';
import { isNativeApp } from '@/utils/env';

function App() {
  useEffect(() => {
    // Migrate to secure storage on native platforms
    if (isNativeApp()) {
      migrateToSecureStorage();
    }
  }, []);

  return (
    // ... existing app code
  );
}
```

#### Step 2.7: Update Info.plist for Keychain Access (15 minutes)

**File:** `ios/App/App/Info.plist` (UPDATE after running `npx cap add ios`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing keys... -->
    
    <!-- Keychain Access -->
    <key>KeychainAccessGroups</key>
    <array>
        <string>$(AppIdentifierPrefix)app.lovable.747d765560614215adc70c8134db2cfc</string>
    </array>
    
    <!-- Keychain Sharing (for app extensions if needed) -->
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.app.lovable.747d765560614215adc70c8134db2cfc</string>
    </array>
</dict>
</plist>
```

### ✅ Phase 2 Testing Checklist

**Development Testing (Web):**
```bash
# 1. Run development build
npm run dev

# 2. Login as customer
# 3. Check localStorage for auth tokens (should still work)

# 4. Logout and login again
# 5. Verify session persists across page reload
```

**Production Testing (iOS):**
```bash
# 1. Build and sync to iOS
npm run build
npx cap sync ios

# 2. Open Xcode
npx cap open ios

# 3. Run on iOS Simulator

# 4. Login as customer
# 5. Check Keychain Access:
#    - Xcode > Window > Devices and Simulators
#    - Select device > Show Container
#    - Library > Keychains > keychain-db
```

**Security Verification:**
```bash
# Check that tokens are NOT in localStorage on iOS
# Use Safari Web Inspector connected to simulator:
# Safari > Develop > Simulator > [Your App]
# Console: localStorage.getItem('supabase.auth.token')
# Should return: null (on native) or token value (on web)
```

**Manual Verification:**
- [ ] Web: Login persists after page reload (localStorage)
- [ ] iOS: Login persists after app restart (Keychain)
- [ ] iOS: Login persists after phone restart (Keychain)
- [ ] iOS: Tokens not visible in localStorage (Security)
- [ ] Payment references stored securely
- [ ] Migration runs on first native launch

---

## 🚀 Deployment Steps

### After implementing both phases:

1. **Commit changes:**
```bash
git add .
git commit -m "feat: implement secure logging and iOS Keychain storage"
```

2. **Build production:**
```bash
npm run build
```

3. **Verify production build:**
```bash
# Check for console.log
grep -r "console.log" dist/

# Check bundle size
ls -lh dist/assets/

# Expected: No console.log found, bundle size reduced by ~5-10%
```

4. **Sync to iOS:**
```bash
npx cap sync ios
npx cap open ios
```

5. **Test on real device:**
- Archive build in Xcode
- Install on test device via TestFlight or direct install
- Verify login/logout works
- Check Keychain via device settings

---

## 📊 Success Metrics

### Phase 1 Success Criteria:
- ✅ Zero `console.log` statements in production bundle
- ✅ All errors logged to `audit_logs` table
- ✅ No sensitive data visible in browser console
- ✅ ESLint passes with no console violations

### Phase 2 Success Criteria:
- ✅ Auth tokens stored in iOS Keychain (verify with Xcode)
- ✅ Web version still works with localStorage
- ✅ Session persists after app restart on iOS
- ✅ Migration completes without errors
- ✅ No auth tokens in localStorage on iOS

---

## 🔍 Troubleshooting

### Common Issues:

**Issue 1: "SecureStoragePlugin not found"**
```bash
# Solution: Rebuild native project
npm install
npx cap sync ios
```

**Issue 2: "Migration failed"**
```typescript
// Check console for errors
// Verify native platform check:
console.log('Is native?', Capacitor.isNativePlatform());
```

**Issue 3: "Session not persisting"**
```typescript
// Check storage adapter initialization:
// In src/integrations/supabase/client.ts
console.log('Storage adapter initialized:', supabaseStorageAdapter);
```

**Issue 4: "ESLint errors for console.log"**
```bash
# Auto-fix most issues:
npm run lint -- --fix

# Manually replace remaining console.log with safeLog.info
```

---

## 📞 Support

If you encounter issues during implementation:

1. Check console for error messages
2. Verify all dependencies installed: `npm list @capacitor-community/secure-storage`
3. Ensure iOS project synced: `npx cap sync ios`
4. Review Xcode build logs for native errors

---

## ✅ Final Checklist

Before moving to Phase 3:

- [ ] Phase 1: Production logger utility created
- [ ] Phase 1: All 719 console.log statements replaced
- [ ] Phase 1: ESLint rule added and passing
- [ ] Phase 1: Production build verified (no console.log)
- [ ] Phase 2: Secure storage plugin installed
- [ ] Phase 2: Storage adapter created and tested
- [ ] Phase 2: Supabase client updated
- [ ] Phase 2: Payment storage updated
- [ ] Phase 2: Migration function added
- [ ] Phase 2: Info.plist updated
- [ ] Both: Web version still works
- [ ] Both: iOS version tested on simulator
- [ ] Both: No breaking changes confirmed

**Estimated completion: 7 hours total**
