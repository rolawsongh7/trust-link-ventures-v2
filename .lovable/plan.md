
# Phase 5.4: Create Multi-Tenancy Database Tables and Wire Up Hooks

## Overview

The frontend hooks (`useTenant`, `useWorkflowConfig`, `useFeatureGuard`) and UI panels (`TenantWorkflowConfigPanel`) already exist but have no backing database tables. This plan creates the required tables, RLS policies, and RPC functions so the existing frontend code works end-to-end.

## Database Migration

A single migration will create 4 tables, 3 RPC functions, RLS policies, and indexes.

### Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Core tenant/organization records with name, slug, status, settings |
| `tenant_users` | Maps users to tenants with a role (owner/admin/member) |
| `tenant_workflow_config` | Per-tenant feature toggle configuration (JSONB) |
| `tenant_feature_eligibility` | Controls which features each tenant can access (for Phase 5.5 `can_tenant_use_feature`) |

### Table Schemas

**tenants**
- `id` UUID PK
- `name` TEXT NOT NULL
- `slug` TEXT NOT NULL UNIQUE
- `status` TEXT NOT NULL DEFAULT 'active' (active/suspended/trial)
- `settings` JSONB DEFAULT '{}'
- `created_at`, `updated_at` TIMESTAMPTZ

**tenant_users**
- `id` UUID PK
- `tenant_id` UUID FK -> tenants
- `user_id` UUID FK -> auth.users
- `role` TEXT NOT NULL DEFAULT 'member' (owner/admin/member)
- `created_at` TIMESTAMPTZ
- UNIQUE(tenant_id, user_id)

**tenant_workflow_config**
- `id` UUID PK
- `tenant_id` UUID FK -> tenants (UNIQUE)
- `config` JSONB NOT NULL DEFAULT '{}'
- `created_at`, `updated_at` TIMESTAMPTZ

**tenant_feature_eligibility**
- `id` UUID PK
- `tenant_id` UUID FK -> tenants
- `feature_key` TEXT NOT NULL
- `enabled` BOOLEAN DEFAULT true
- `disabled_reason` TEXT
- `created_at`, `updated_at` TIMESTAMPTZ
- UNIQUE(tenant_id, feature_key)

### RLS Policies

- **tenants**: Super admins can do everything; tenant members can SELECT their own tenant
- **tenant_users**: Super admins can do everything; users can SELECT their own row
- **tenant_workflow_config**: Super admins can do everything; tenant members can SELECT their tenant's config
- **tenant_feature_eligibility**: Super admins can do everything; tenant members can SELECT their tenant's eligibility

All policies use the existing `user_roles` table to check for `super_admin` role.

### RPC Functions

1. **`get_tenant_workflow_config(p_tenant_id UUID)`** -- Returns the merged config (defaults + stored overrides). Used by `useWorkflowConfig` hook.

2. **`update_tenant_workflow_config(p_tenant_id UUID, p_config JSONB)`** -- Upserts workflow config for a tenant. Super admin only. Returns `{success: true}`. Used by `useUpdateWorkflowConfig` hook.

3. **`can_tenant_use_feature(p_tenant_id UUID, p_feature_key TEXT)`** -- Checks `tenant_feature_eligibility` table. Returns `{allowed: boolean, reason: text}`. Used by `useCanUseFeature` hook (Phase 5.5).

All RPCs use `SECURITY DEFINER` to avoid RLS recursion issues.

## Frontend Changes

### No hook changes needed
The hooks (`useTenant`, `useWorkflowConfig`, `useFeatureGuard`) already use `(supabase as any)` casts and match the table/RPC names exactly. They will work immediately once the migration runs.

### Minor: Remove `(supabase as any)` casts (optional cleanup)
After the migration creates the tables and types are regenerated, the `as any` casts in the hooks could be removed. This is optional and won't be done in this phase to keep scope focused.

## Files

### New File
| File | Purpose |
|------|---------|
| `supabase/migrations/[timestamp]_phase_5_4_multi_tenancy.sql` | Full migration with tables, indexes, RLS, RPCs |

### No Modified Files
The existing hooks and UI components are already built to work with these exact table and function names.

## Summary

This is a database-only change. Once the migration runs, the existing `useTenant`, `useWorkflowConfig`, `useFeatureGuard` hooks and the `TenantWorkflowConfigPanel` UI will all become functional.
