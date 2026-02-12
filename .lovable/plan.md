

# Tenant Feature Eligibility Admin Panel

## Overview

Create a new admin UI component that lets super admins manage per-tenant feature eligibility (the `tenant_feature_eligibility` table). This panel will be added to the existing "Tenants" tab in the Super Admin settings, alongside the existing `TenantWorkflowConfigPanel`.

## What It Does

- Shows a list of all tenants (reusing `useAllTenants`)
- When a super admin clicks "Manage Features" on a tenant, a dialog opens showing all 6 feature keys (`quotes`, `credit_terms`, `loyalty_program`, `payment_proofs`, `standing_orders`, `auto_invoicing`)
- Each feature has a toggle (enabled/disabled) and a text field for the disabled reason
- Changes are saved directly to the `tenant_feature_eligibility` table
- Follows the same visual patterns as the existing `KillSwitchPanel` and `TenantWorkflowConfigPanel`

## Changes

### 1. New Component: `TenantFeatureEligibilityPanel`

**File:** `src/components/admin/TenantFeatureEligibilityPanel.tsx`

- Lists all tenants with a "Manage Features" button per tenant
- Opens a dialog with toggle switches for each of the 6 `TenantFeatureKey` values
- Fetches current eligibility from `tenant_feature_eligibility` table for the selected tenant
- Upserts rows on save (insert if new, update if existing)
- Shows colored status indicators (green = enabled, red = disabled with reason)
- Uses the same Card/Dialog/Switch/Badge patterns as `KillSwitchPanel`

### 2. Add to Super Admin Tenants Tab

**File:** `src/components/settings/SuperAdminTab.tsx`

- Import and render `TenantFeatureEligibilityPanel` below the existing `TenantWorkflowConfigPanel` in the "tenants" tab content

### 3. New Hook: `useTenantFeatureEligibility`

**File:** `src/hooks/useTenantFeatureEligibility.ts`

- `useTenantFeatureEligibility(tenantId)` -- fetches all rows from `tenant_feature_eligibility` for a given tenant
- `useUpdateTenantFeatureEligibility()` -- mutation that upserts a row (tenant_id, feature_key, enabled, disabled_reason)
- Super admin access gated via `useRoleAuth`

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useTenantFeatureEligibility.ts` | Query + mutation hooks for `tenant_feature_eligibility` table |
| `src/components/admin/TenantFeatureEligibilityPanel.tsx` | UI panel with tenant list and feature toggle dialog |

### Modified Files
| File | Change |
|------|--------|
| `src/components/settings/SuperAdminTab.tsx` | Import and render `TenantFeatureEligibilityPanel` in tenants tab |

### No Database Changes
The `tenant_feature_eligibility` table, RLS policies, and `can_tenant_use_feature` RPC already exist from Phase 5.4.

