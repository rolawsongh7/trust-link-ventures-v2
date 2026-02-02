

# Plan: Fix Super Admin Access Across All Workflow Tasks

## Problem Summary

When trying to create a quote from a customer quote inquiry, the super_admin user (`info@trustlinkcompany.com`) gets denied access. Investigation revealed that while some tables (like `quotes`, `quote_requests`, `invoices`) were fixed in the previous migration, **many other tables still use RLS policies that only check for `'admin'` role**, excluding super_admin users.

The specific failure occurs when trying to insert `quote_items` after creating a quote - the INSERT policy uses `check_user_role(auth.uid(), 'admin')` which returns `false` for super_admin.

## Tables Requiring RLS Policy Updates

### Critical (Blocks Quote Creation Workflow)

| Table | Policies to Update |
|-------|-------------------|
| `quote_items` | Admins can insert, update, delete, view |
| `customers` | Delete, Role-based viewing, Update |
| `orders` | DELETE, UPDATE, SELECT, INSERT |

### Important (Other Admin Workflows)

| Table | Policies to Update |
|-------|-------------------|
| `customer_addresses` | ALL, SELECT |
| `customer_users` | ALL |
| `invoice_items` | ALL |
| `opportunities` | DELETE, UPDATE, SELECT |
| `activities` | DELETE |
| `communications` | DELETE |
| `supplier_products` | ALL, DELETE, INSERT |
| `user_roles` | INSERT, UPDATE, DELETE, SELECT |
| `account_deletions` | SELECT |
| `audit_logs` | SELECT |
| `csp_violations` | SELECT |
| `failed_login_attempts` | SELECT |
| `file_uploads` | SELECT |
| `order_status_history` | SELECT |
| `quote_status_history` | SELECT |
| `quote_view_analytics` | SELECT |
| `security_alert_rules` | ALL |
| `security_alerts` | UPDATE, SELECT |
| `system_events` | SELECT |
| `password_policies` | ALL |
| `pipeline_stages` | ALL |
| `products` | DELETE |
| `delivery_tracking_tokens` | ALL |
| `newsletter_subscriptions` | ALL, SELECT |

## Solution

Create a database migration that updates all policies to use `is_admin()` instead of `check_user_role(auth.uid(), 'admin')` or `get_user_role(auth.uid()) = 'admin'`.

The existing `is_admin()` function already correctly includes both roles:
```sql
SELECT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
);
```

### Migration Strategy

1. Drop existing policies that use exact admin role matching
2. Recreate them using `is_admin()` function
3. For policies that combine admin check with other conditions (like customer access), update only the admin portion

## Technical Implementation

A single migration file will:

### Phase 1: Critical Tables (Quote Workflow)

**quote_items table:**
```sql
DROP POLICY IF EXISTS "Admins can insert quote items" ON quote_items;
DROP POLICY IF EXISTS "Admins can update quote items" ON quote_items;
DROP POLICY IF EXISTS "Admins can delete quote items" ON quote_items;
DROP POLICY IF EXISTS "Users can view relevant quote items" ON quote_items;

CREATE POLICY "Admins can insert quote items" 
  ON quote_items FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update quote items" 
  ON quote_items FOR UPDATE TO authenticated 
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quote items" 
  ON quote_items FOR DELETE TO authenticated 
  USING (is_admin());

CREATE POLICY "Users can view relevant quote items" 
  ON quote_items FOR SELECT TO authenticated 
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_items.quote_id 
      AND (q.customer_email = (auth.jwt() ->> 'email')
        OR q.customer_id IN (SELECT cu.customer_id FROM customer_users cu WHERE cu.user_id = auth.uid()))
    )
  );
```

**customers table:**
```sql
DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
DROP POLICY IF EXISTS "Role-based customer viewing" ON customers;
DROP POLICY IF EXISTS "Users can update assigned customers" ON customers;

-- Recreate with is_admin()
```

**orders table:**
```sql
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Orders can be created by authorized users or system" ON orders;
DROP POLICY IF EXISTS "Customers and admins can update orders" ON orders;

-- Recreate with is_admin()
```

### Phase 2: All Other Admin Tables

Similar updates for all remaining tables listed above, ensuring super_admin has the same access as admin across the entire platform.

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_fix_super_admin_all_rls_policies.sql` | Comprehensive RLS policy update |

## Testing Steps

After applying the migration:
1. Log in as `info@trustlinkcompany.com` (super_admin)
2. Navigate to Customer Quote Inquiries
3. Click "Create Quote" on a pending request
4. Verify the quote is created with items successfully
5. Test other workflows: orders, customer management, invoices

## Why This Will Work

1. **Single source of truth**: The `is_admin()` function already handles both roles
2. **Comprehensive fix**: Updates ALL policies that check for admin role
3. **Maintains security**: Only changes how admin access is verified, doesn't open access to unauthorized users
4. **Future-proof**: Any new admin-level roles can be added to `is_admin()` function once

