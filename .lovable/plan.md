

# Plan: Fix Admin Portal Access for Super Admin on Production

## Problem Summary

The user `info@trustlinkcompany.com` (with `super_admin` role) can successfully log in on the Lovable preview but gets "Access Denied" on production (`trustlinkcompany.com`).

**Evidence from Auth Logs:**
- Login succeeds at 13:33:39 (status 200)
- Logout happens immediately at 13:33:39 (status 204)
- This pattern repeats on every production login attempt

## Root Cause Analysis

The `check_user_role` RPC calls in `AdminAuth.tsx` are not properly handling errors. When the RPC fails (returns `null`/`undefined` with an error), the code treats this as "user doesn't have the role" instead of "check failed":

```typescript
// Current problematic code (lines 163-180)
const { data: isAdmin } = await supabase.rpc('check_user_role', {...});
const { data: isSuperAdmin } = await supabase.rpc('check_user_role', {...});

if (!isAdmin && !isSuperAdmin) {  // This triggers if data is null/undefined!
  await supabase.auth.signOut();
  // Access Denied...
}
```

**Why it works on preview but fails on production:**
- Network latency or timing differences between preview and production
- The auth token may not be fully propagated to the database connection immediately after login
- Production may have stricter CORS or different network conditions

## Solution

### File Changes

**1. `src/pages/AdminAuth.tsx`** - Add error handling and retry logic for RPC calls

Update the role checking section (lines 161-181) to:
- Capture and log RPC errors
- Add a small delay to ensure auth token is propagated
- Retry the check once if it fails
- Only sign out if role check definitively returns `false` (not on error)

**2. `src/hooks/useRoleAuth.tsx`** - Add similar error handling

Update the `fetchUserRole` function to handle RPC errors more gracefully and add logging.

### Technical Implementation

**AdminAuth.tsx changes:**

```typescript
// After getting session, add a small delay to ensure token propagation
await new Promise(resolve => setTimeout(resolve, 100));

// Check roles with proper error handling
const checkRoleWithRetry = async (role: string, retries = 2): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase.rpc('check_user_role', {
      check_user_id: currentSession.user.id,
      required_role: role
    });
    
    if (error) {
      console.error(`[AdminAuth] Role check error (attempt ${i + 1}):`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      return false; // Final attempt failed
    }
    
    return data === true;
  }
  return false;
};

const isAdmin = await checkRoleWithRetry('admin');
const isSuperAdmin = await checkRoleWithRetry('super_admin');

console.log('[AdminAuth] Role check results:', { 
  isAdmin, 
  isSuperAdmin, 
  userId: currentSession.user.id 
});

if (!isAdmin && !isSuperAdmin) {
  console.warn('[AdminAuth] Access denied for user:', currentSession.user.email);
  await supabase.auth.signOut();
  // Show toast...
}
```

**useRoleAuth.tsx changes:**

Add similar error handling and logging to the `fetchUserRole` function to ensure consistent behavior across all role checks.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/AdminAuth.tsx` | Add error handling, delay, retry logic, and logging for role checks |
| `src/hooks/useRoleAuth.tsx` | Add error handling and logging for role fetching |

### Testing Steps

After implementation:
1. Publish the changes to production
2. Navigate to `https://admin.trustlinkcompany.com`
3. Sign in with `info@trustlinkcompany.com`
4. Verify successful redirect to admin dashboard
5. Check browser console for role check logs to confirm the fix is working

### Why This Will Work

1. **Error handling**: Distinguishes between "check failed" (retry or continue cautiously) vs "user doesn't have role" (deny access)
2. **Delay after login**: Ensures the auth token is fully propagated to the database connection
3. **Retry logic**: Handles transient network issues
4. **Logging**: Provides visibility into what's happening for future debugging

