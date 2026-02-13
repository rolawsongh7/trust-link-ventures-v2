

# Phase 6.2: Hesed Platform Admin — Implementation Plan

## Overview
Build the Hesed Platform Admin system with three-tier domain resolution. All changes are additive — TrustLink Ventures (Tenant 1) continues working exactly as today.

**Domain Architecture:**

| Domain | Purpose |
|--------|---------|
| heseddigitech.com | Hesed marketing site |
| admin.heseddigitech.com | Platform Admin (super-admin only) |
| trustlinkcompany.com | Tenant 1 public portal |
| admin.trustlinkcompany.com | Tenant 1 admin dashboard |

---

## Step 1: Database Migration

Add two nullable columns to `tenants` table:

- `domain` (TEXT UNIQUE) — tenant public portal hostname
- `admin_domain` (TEXT UNIQUE) — tenant admin dashboard hostname
- Indexes on both columns for fast hostname lookups
- Backfill Tenant 1 with `trustlinkcompany.com` / `admin.trustlinkcompany.com`

---

## Step 2: Domain Resolution

**Modify `src/utils/env.ts`** — Add:
- `isPlatformAdminDomain()` — detects `admin.heseddigitech.com` or `/platform` path in preview
- `isPlatformPublicDomain()` — detects `heseddigitech.com` (non-admin)

**Modify `src/utils/domainUtils.ts`** — Add platform URL helpers

Resolution order:
1. Platform Admin domain check
2. Platform Marketing domain check
3. Tenant admin_domain lookup
4. Tenant domain lookup
5. Default to Tenant 1 (preview fallback)

---

## Step 3: Platform Marketing Page

**Create `src/pages/platform/PlatformHome.tsx`**
- Hesed-branded landing page
- Hero, feature highlights, CTA sections
- Accessible at `heseddigitech.com` or `/platform/home` in preview

---

## Step 4: Platform Admin Dashboard

**New files:**

| File | Purpose |
|------|---------|
| `src/pages/platform/PlatformDashboard.tsx` | Overview stats (tenant count, users) |
| `src/pages/platform/PlatformTenants.tsx` | Tenant list with CRUD actions |
| `src/components/platform/PlatformLayout.tsx` | Hesed-branded layout shell |
| `src/components/platform/PlatformSidebar.tsx` | Platform navigation |
| `src/components/platform/PlatformProtectedRoute.tsx` | Super-admin access guard |
| `src/components/platform/CreateTenantDialog.tsx` | Tenant creation form (name, slug, status, domain, admin_domain, owner email) |

---

## Step 5: Routing Updates

**Modify `src/App.tsx`** — Add platform route blocks at the top, before existing tenant routes:

- `isPlatformAdminDomain()` routes: `/platform/dashboard`, `/platform/tenants`, `/platform/settings`
- `isPlatformPublicDomain()` routes: `/` renders marketing page
- All existing routes remain untouched

---

## Step 6: Preview Testing

- `/platform` prefix triggers platform admin mode in Lovable preview
- `/platform/home` shows marketing page in preview
- All existing routes (`/admin/*`, `/portal/*`, `/products`, etc.) continue working

---

## Safety Guarantees

- Zero impact on TrustLink Ventures — platform code is behind domain checks
- Zero impact on native mobile app — `isNativeApp()` short-circuits first
- Nullable columns — existing queries and RLS policies unaffected
- Additive only — 3 files modified (with additions), 7 new files created, nothing deleted

---

## Technical Details

### Files Modified (3)
1. `src/utils/env.ts` — Add `isPlatformAdminDomain()`, `isPlatformPublicDomain()`
2. `src/utils/domainUtils.ts` — Add platform URL helpers
3. `src/App.tsx` — Add platform route blocks before existing routes

### Files Created (7)
1. `src/pages/platform/PlatformHome.tsx`
2. `src/pages/platform/PlatformDashboard.tsx`
3. `src/pages/platform/PlatformTenants.tsx`
4. `src/components/platform/PlatformLayout.tsx`
5. `src/components/platform/PlatformSidebar.tsx`
6. `src/components/platform/PlatformProtectedRoute.tsx`
7. `src/components/platform/CreateTenantDialog.tsx`

### Database Changes (1 migration)
- ALTER TABLE `tenants`: add `domain`, `admin_domain` columns with unique indexes
- UPDATE Tenant 1 with `trustlinkcompany.com` / `admin.trustlinkcompany.com`

