

# Phase 6.1 -- Tenant Core Infrastructure (Non-Breaking Migration)

## Current State Assessment

**What exists:**
- `tenants` table with 1 record: "TrustLink Demo" (id: `e63a2137-261f-4a63-b805-041cd97ff7a4`, slug: `trustlink-demo`)
- `tenant_users` table with 1 record linking user `7fca904d` to the tenant as `owner`
- `tenant_feature_eligibility` and `tenant_workflow_config` tables (governance scaffolding)
- `useTenant` hook that fetches the current user's tenant association
- RLS on tenant tables only (super_admin full access + member read)

**What is missing (the work of this phase):**
- No `tenant_id` column on any core business table
- No `get_current_tenant_id()` Postgres function
- No tenant-scoped RLS policies on business tables
- No frontend TenantContext that auto-injects `tenant_id` on writes
- Only 1 of 8 users is linked to a tenant
- 50+ edge functions have no tenant awareness

## Scope of Change

### Tables Receiving `tenant_id`

**Tier 1 -- Primary business tables** (directly queried by 38-51 files each):
- `customers` (5 rows)
- `orders` (40 rows)
- `quotes` (49 rows)
- `invoices` (53 rows)
- `leads` (1 row)
- `products` (0 rows)
- `communications` (50 rows)
- `payment_records` (7 rows)

**Tier 2 -- Child/junction tables** (inherit tenant via parent, but need column for RLS):
- `order_items`
- `order_status_history`
- `quote_items`
- `quote_request_items`
- `quote_requests`
- `quote_submissions`
- `quote_revisions`
- `quote_approvals`
- `quote_status_history`
- `invoice_items`
- `standing_orders`
- `standing_order_items`
- `standing_order_generations`

**Tier 3 -- Supporting operational tables:**
- `audit_logs` (1,859 rows)
- `activities`
- `notifications`
- `email_logs`
- `file_uploads`
- `payment_transactions`
- `delivery_history`
- `cart_items`
- `customer_favorites`

**Tier 4 -- Trust/credit/loyalty tables:**
- `customer_trust_profiles`
- `customer_trust_history`
- `customer_credit_terms`
- `customer_credit_ledger`
- `customer_loyalty`
- `customer_benefits`
- `customer_addresses`
- `customer_users`

**Tier 5 -- CRM tables:**
- `opportunities`
- `pipeline_stages`
- `rfqs`

**Explicitly excluded (system-wide, not tenant-scoped):**
- `tenants`, `tenant_users`, `tenant_feature_eligibility`, `tenant_workflow_config`
- `system_feature_flags`, `system_settings`, `system_events`
- `user_roles`, `profiles`, `user_sessions`, `user_preferences`
- `password_policies`, `password_history`, `ip_whitelist`
- `csp_violations`, `rate_limit_attempts`
- `newsletter_subscriptions`, `consent_history`, `privacy_settings`
- Security tables (`security_alerts`, `security_events`, etc.)
- Device/MFA tables (`trusted_devices`, `device_fingerprints`, `user_mfa_settings`, etc.)

---

## Implementation Steps

### Step 1: Database Migration -- Add `tenant_id` Column

A single migration that:
1. Adds `tenant_id UUID` (nullable) to all Tier 1-5 tables listed above
2. Backfills every existing row with the known Tenant 1 ID (`e63a2137-261f-4a63-b805-041cd97ff7a4`)
3. Sets `NOT NULL` constraint after backfill
4. Adds foreign key constraint referencing `tenants(id) ON DELETE CASCADE`
5. Creates indexes on `tenant_id` for every table

```text
For each table:
  ALTER TABLE {table} ADD COLUMN tenant_id UUID;
  UPDATE {table} SET tenant_id = 'e63a2137-...' WHERE tenant_id IS NULL;
  ALTER TABLE {table} ALTER COLUMN tenant_id SET NOT NULL;
  ALTER TABLE {table} ADD CONSTRAINT {table}_tenant_fk FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  CREATE INDEX idx_{table}_tenant_id ON {table}(tenant_id);
```

### Step 2: Backfill All Users into `tenant_users`

Insert the remaining 7 users (of 8 total) into `tenant_users` as `member` role for Tenant 1. The existing owner record stays untouched.

```text
INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT 'e63a2137-...', id, 'member'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM tenant_users)
ON CONFLICT DO NOTHING;
```

### Step 3: Create `get_current_tenant_id()` Function

```text
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

This is the single isolation primitive used by all RLS policies.

### Step 4: Update RLS Policies on All Business Tables

For each Tier 1-5 table, update or add RLS policies to include tenant scoping with super_admin bypass:

```text
-- Pattern for SELECT policies:
USING (
  tenant_id = get_current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)

-- Pattern for INSERT policies (WITH CHECK):
WITH CHECK (
  tenant_id = get_current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
```

Existing policies will be dropped and recreated to incorporate the `tenant_id` clause. The existing role-based and customer-based access patterns (e.g., "Customers can view their linked profiles") are preserved within the tenant boundary.

**Tables with existing RLS policies that need updating:** customers (6 policies), orders (8 policies), quotes (5 policies), invoices (3 policies), leads (3 policies), products (4 policies), communications (7 policies), audit_logs (5 policies), payment_records (7 policies), payment_transactions (1 policy).

### Step 5: Create `TenantContext` and `TenantProvider`

**New file:** `src/contexts/TenantContext.tsx`

- Wraps the app at the top level (inside `AuthProvider`, outside routes)
- On login, fetches the user's `tenant_users` row via the existing `useTenant` hook pattern
- Exposes `currentTenantId`, `currentTenantRole`, `tenantLoading`
- Provides a helper `withTenantId(obj)` that merges `{ tenant_id: currentTenantId }` into any insert payload

### Step 6: Create `useTenantId()` Hook

**New file:** `src/hooks/useTenantId.ts`

Convenience hook that returns the current tenant ID from context. Used across all components that perform Supabase inserts/updates.

```text
export function useTenantId(): string | null {
  const { currentTenantId } = useTenantContext();
  return currentTenantId;
}
```

### Step 7: Integrate TenantProvider into App

**Modified file:** `src/App.tsx`

Wrap the router with `<TenantProvider>` inside `<AuthProvider>`.

### Step 8: Update All Frontend INSERT Operations

Every Supabase `.insert()` call across the codebase must include `tenant_id`. This affects approximately 38+ files for customers, 51+ files for orders, 38+ files for quotes, 13+ files for invoices, and 11+ files for leads.

**Pattern change:**
```text
// Before:
.insert({ customer_id, status: 'draft', ... })

// After:
.insert({ customer_id, status: 'draft', tenant_id: currentTenantId, ... })
```

Key files requiring insert updates (non-exhaustive):
- `src/components/quotes/wizard/InlineCustomerForm.tsx` (customer insert)
- `src/components/customer/CustomerCart.tsx` (customer + order insert)
- `src/components/quotes/QuoteUploadDialog.tsx` (quote insert)
- `src/services/invoiceService.ts` (invoice inserts)
- `src/components/LeadsManagement.tsx` (lead inserts)
- `src/components/QuoteRequestManagement.tsx` (lead insert)
- `src/components/CommunicationsManagement.tsx` (communication inserts)
- `src/hooks/useLeadsQuery.ts` (lead insert)

**Note:** SELECT queries do NOT need manual `tenant_id` filtering -- RLS handles this automatically. But all INSERTs must include the column since it is NOT NULL.

### Step 9: Update Edge Functions

Edge functions that insert into tenant-scoped tables need to resolve the tenant_id. Since edge functions typically use a service role key (bypassing RLS), they must explicitly determine and include tenant_id.

**Strategy:** For edge functions that operate on behalf of a user (e.g., `quote-submission`, `submit-lead`), resolve tenant_id from the authenticated user's `tenant_users` row. For system-level functions (e.g., `check-expiring-quotes`), iterate per-tenant or use the service role with explicit tenant scoping.

Key edge functions requiring updates:
- `submit-lead` (inserts lead)
- `quote-submission` (inserts quote data)
- `quote-approval` (updates quotes)
- `notify-admins` (inserts notifications)
- `send-email` (inserts email_logs)
- `workflow-lead-scoring` (updates leads)
- `workflow-auto-deliver` (updates orders)

### Step 10: Validation Queries

After implementation, run these verification queries:

```text
-- Verify no orphaned rows (must all return 0)
SELECT 'customers' as t, count(*) FROM customers WHERE tenant_id IS NULL
UNION ALL SELECT 'orders', count(*) FROM orders WHERE tenant_id IS NULL
UNION ALL SELECT 'quotes', count(*) FROM quotes WHERE tenant_id IS NULL
UNION ALL SELECT 'invoices', count(*) FROM invoices WHERE tenant_id IS NULL
UNION ALL SELECT 'leads', count(*) FROM leads WHERE tenant_id IS NULL;

-- Verify all users have tenant membership
SELECT count(*) FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM tenant_users tu WHERE tu.user_id = u.id);
-- Must return 0

-- Verify isolation: create test tenant, confirm no data leaks
```

---

## What This Phase Does NOT Do

- No billing or subscription management
- No onboarding wizard for new tenants
- No domain routing (admin.tenant.com)
- No feature gating changes (that's already in place)
- No workflow logic changes
- No payment behavior changes
- No UI changes beyond the TenantContext provider wrapper

---

## Risk Mitigation

1. **Column addition is nullable first** -- existing code continues to work during the migration window
2. **Backfill before NOT NULL** -- no constraint violations
3. **RLS policies preserve existing patterns** -- customer self-service access, admin access all remain, just scoped within tenant boundary
4. **`get_current_tenant_id()` returns NULL for unlinked users** -- gracefully fails rather than leaking data (RLS will deny access, which is the safe default)
5. **Super admin bypass** ensures platform operators retain cross-tenant visibility
6. **Edge functions using service role** bypass RLS naturally but will be updated to include explicit tenant_id for data integrity

## Estimated Scope

- 1 large database migration (adds columns to ~35 tables, backfills, adds constraints, rewrites ~44 RLS policies)
- 2 new files (TenantContext, useTenantId hook)
- 1 modified file (App.tsx for provider)
- ~40-60 component/hook files updated to include tenant_id on inserts
- ~10 edge functions updated for tenant awareness

