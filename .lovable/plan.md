
# Plan: Fix RLS Policies for Super Admin Access

## Problem Summary

The admin portal shows only 1 quote instead of the expected 58 quote requests, 48 quotes, and 52 invoices. The user `info@trustlinkcompany.com` has the `super_admin` role, but the RLS (Row Level Security) policies on these tables only check for the exact `'admin'` role.

**Database confirmation:**
- 58 quote requests exist in the database
- `check_user_role('...', 'admin')` returns `false` for super_admin users
- `check_user_role('...', 'super_admin')` returns `true`

## Root Cause

Several RLS policies use exact role matching that excludes `super_admin`:

| Table | Policy | Current Check |
|-------|--------|---------------|
| `quote_requests` | Admins can view all quote requests | `check_user_role(auth.uid(), 'admin')` |
| `quote_requests` | Admins can update quote requests | `check_user_role(auth.uid(), 'admin')` |
| `quote_requests` | Admins can delete quote requests | `get_user_role(auth.uid()) = 'admin'` |
| `quotes` | Admins can manage all quotes | `role = 'admin'::user_role` |
| `quotes` | Admins can delete quotes | `check_user_role(auth.uid(), 'admin')` |
| `invoices` | Admins can manage all invoices | `check_user_role(auth.uid(), 'admin')` |
| `invoices` | Customers and admins can view invoices | `check_user_role(auth.uid(), 'admin')` |

## Solution

A helper function `is_admin()` already exists and correctly includes both roles:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
);
```

We need to create a database migration that drops the old policies and recreates them using `is_admin()`.

---

## Technical Implementation

### Migration File

Create a new migration file that:

1. **Drop existing policies** on all three tables
2. **Recreate policies** using `is_admin()` function

```sql
-- =============================================
-- FIX: Update RLS policies to include super_admin
-- =============================================

-- QUOTE_REQUESTS TABLE
DROP POLICY IF EXISTS "Admins can view all quote requests" ON quote_requests;
DROP POLICY IF EXISTS "Admins can update quote requests" ON quote_requests;
DROP POLICY IF EXISTS "Admins can delete quote requests" ON quote_requests;

CREATE POLICY "Admins can view all quote requests" 
  ON quote_requests FOR SELECT 
  TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can update quote requests" 
  ON quote_requests FOR UPDATE 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quote requests" 
  ON quote_requests FOR DELETE 
  TO public 
  USING (is_admin());

-- QUOTES TABLE
DROP POLICY IF EXISTS "Admins can manage all quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON quotes;

CREATE POLICY "Admins can manage all quotes" 
  ON quotes FOR ALL 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quotes" 
  ON quotes FOR DELETE 
  TO public 
  USING (is_admin());

-- INVOICES TABLE
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Customers and admins can view invoices" ON invoices;

CREATE POLICY "Admins can manage all invoices" 
  ON invoices FOR ALL 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Customers and admins can view invoices" 
  ON invoices FOR SELECT 
  TO authenticated 
  USING (
    customer_id = auth.uid() 
    OR user_can_access_customer(customer_id, auth.uid()) 
    OR is_admin()
  );
```

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_fix_super_admin_rls_policies.sql` | Update RLS policies to use `is_admin()` |

## Testing Steps

After applying the migration:
1. Log in as `info@trustlinkcompany.com` (super_admin)
2. Navigate to Customer Quote Inquiries → should see all 58 requests
3. Navigate to Quote Management → should see all 48 quotes
4. Navigate to Invoices → should see all 52 invoices

## Why This Works

The `is_admin()` function already handles both roles correctly:
- Returns `true` if user has `admin` role
- Returns `true` if user has `super_admin` role
- Returns `false` otherwise

By using this function consistently across all admin-related RLS policies, super admins will have the same data access as regular admins.
