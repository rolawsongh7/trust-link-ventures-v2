

# Add "Create Tenant" UI to Super Admin Panel

## Overview
Add a "Create Tenant" button and dialog to the Super Admin > Tenants tab, allowing super admins to create new tenant organizations directly from the UI without database access.

## New Component: `CreateTenantDialog.tsx`

**Location:** `src/components/admin/CreateTenantDialog.tsx`

**Form Fields:**
- **Tenant Name** (required) - e.g., "Acme Corp"
- **Slug** (required, auto-generated from name) - e.g., "acme-corp"
- **Status** (select: active / trial / suspended, default: active)
- **Owner Email** (optional) - looks up user by email and assigns as owner

**Behavior:**
1. Validates slug uniqueness against existing tenants
2. Inserts into `tenants` table
3. If owner email provided, looks up user ID from `auth.users` (via profiles table) and inserts into `tenant_users` with role `owner`
4. Shows success toast and invalidates the `['tenants', 'all']` query to refresh the list
5. Closes dialog on success

## Modified File: `TenantFeatureEligibilityPanel.tsx`

Add a "Create Tenant" button next to the panel header that opens the new dialog.

## Modified File: `TenantWorkflowConfigPanel.tsx`

Add the same "Create Tenant" button for consistency across both tenant management panels.

## Technical Details

- Uses `react-hook-form` with `zod` validation (matching existing patterns)
- Slug auto-generation: lowercase, replace spaces/special chars with hyphens
- Owner lookup queries `profiles` table by email field
- All operations use the existing `supabase` client
- No new database tables or migrations needed -- uses existing `tenants` and `tenant_users` tables
- No new dependencies required

