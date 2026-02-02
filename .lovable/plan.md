

# Plan: Fix Admin Portal Access for Super Admins

## Problem Identified

The user `info@trustlinkcompany.com` already has the `super_admin` role assigned in the database (verified via query). However, the admin portal login flow only checks for the exact `'admin'` role, causing super_admin users to be denied access.

## Current State

- **User exists**: `info@trustlinkcompany.com` (ID: `7fca904d-7b99-45ae-8f40-b710dc149cf2`)
- **Role assigned**: `super_admin` (since 2025-10-15, last updated 2026-01-30)
- **Problem**: `AdminAuth.tsx` only checks `check_user_role('admin')` which returns `false` for super_admins

## Root Cause

The `check_user_role` function performs an **exact match** check:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = check_user_id AND role::text = required_role
);
```

When called with `'admin'`, it doesn't match a user with `'super_admin'` role.

## Solution

Update two files to recognize `super_admin` as having admin portal access:

### 1. Fix `src/pages/AdminAuth.tsx` (Lines 161-175)

**Current Code:**
```typescript
const { data: isAdmin } = await supabase.rpc('check_user_role', {
  check_user_id: currentSession.user.id,
  required_role: 'admin'
});

if (!isAdmin) {
  await supabase.auth.signOut();
  // Access denied...
}
```

**Updated Code:**
```typescript
// Check if user has admin OR super_admin role
const { data: isAdmin } = await supabase.rpc('check_user_role', {
  check_user_id: currentSession.user.id,
  required_role: 'admin'
});

const { data: isSuperAdmin } = await supabase.rpc('check_user_role', {
  check_user_id: currentSession.user.id,
  required_role: 'super_admin'
});

if (!isAdmin && !isSuperAdmin) {
  await supabase.auth.signOut();
  // Access denied...
}
```

### 2. Fix `src/contexts/AuthContext.tsx` (Lines 84-96)

**Current Code:**
```typescript
const adminPromise = supabase.rpc('check_user_role', {
  check_user_id: userId,
  required_role: 'admin'
});

const { data: isAdmin } = await Promise.race([adminPromise, timeoutPromise]);

if (isAdmin) {
  setUserRole('admin');
  return;
}
```

**Updated Code:**
```typescript
// Check for super_admin first
const superAdminPromise = supabase.rpc('check_user_role', {
  check_user_id: userId,
  required_role: 'super_admin'
});

const { data: isSuperAdmin } = await Promise.race([superAdminPromise, timeoutPromise]);

if (isSuperAdmin) {
  setUserRole('admin'); // Super admins have full admin access
  return;
}

// Then check for regular admin
const adminPromise = supabase.rpc('check_user_role', {
  check_user_id: userId,
  required_role: 'admin'
});

const { data: isAdmin } = await Promise.race([adminPromise, timeoutPromise]);

if (isAdmin) {
  setUserRole('admin');
  return;
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/AdminAuth.tsx` | Add super_admin check to login validation |
| `src/contexts/AuthContext.tsx` | Check super_admin before admin in role fetching |

## Testing Steps

After implementation:
1. Navigate to `/admin/login`
2. Sign in with `info@trustlinkcompany.com`
3. Verify successful redirect to `/admin/dashboard`
4. Confirm super admin features are accessible in Settings

## No Database Changes Required

The user already has the correct role. This is purely a frontend fix to properly recognize the `super_admin` role.

