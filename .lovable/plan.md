
# Plan: Connect Advanced Analytics to Admin Portal

## Problem Identified

The **Advanced Analytics** page (`src/pages/AdvancedAnalytics.tsx`) with 5 enterprise tabs is not connected to the admin portal. The current routing points to an older `AnalyticsPage.tsx` instead.

### Current State
| File | Description | Connected? |
|------|-------------|------------|
| `AdvancedAnalytics.tsx` | Enterprise BI (5 tabs: Executive, Customer, Operations, Automation, Audit) | Not routed |
| `AnalyticsPage.tsx` | Older analytics (3 tabs: Overview, Customer, Business) | Currently at `/admin/analytics` |

---

## Solution

Replace the older analytics page with the new Advanced Analytics in the admin routing and sidebar.

---

## Implementation Steps

### Step 1: Update App.tsx Routing

**File: `src/App.tsx`**

Replace the `AnalyticsPage` import and route with `AdvancedAnalytics`:

- Change import from `AnalyticsPage` to `AdvancedAnalytics`
- Update route at `/admin/analytics` to render `AdvancedAnalytics`

**Changes in 3 route blocks:**
1. Preview mode routes (line ~199)
2. Admin-only production routes (line ~293)
3. Native app routes (if applicable)

### Step 2: Update Sidebar Icon and Label

**File: `src/components/layout/AppSidebar.tsx`**

Update the Analytics navigation item to use the `Brain` icon (matching the Advanced Analytics page) instead of `BarChart3`:

```typescript
// Change from:
{ title: 'Analytics', url: '/admin/analytics', icon: BarChart3, badge: 'analytics' as const }

// Change to:
{ title: 'Business Intelligence', url: '/admin/analytics', icon: Brain, badge: 'analytics' as const }
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Replace `AnalyticsPage` import and routes with `AdvancedAnalytics` |
| `src/components/layout/AppSidebar.tsx` | Update icon to `Brain`, optionally rename to "Business Intelligence" |

---

## Optional: Keep Old Analytics as Sub-Route

If you want to preserve the older analytics page, we can add it as a sub-route:
- `/admin/analytics` → Advanced Analytics (new default)
- `/admin/analytics/legacy` → Old AnalyticsPage

This is optional and can be skipped if the new page fully replaces the old one.

---

## Result After Implementation

- Sidebar "Analytics" (or "Business Intelligence") links to `/admin/analytics`
- `/admin/analytics` renders `AdvancedAnalytics.tsx` with all 5 enterprise tabs
- Brain icon in sidebar matches the page header icon
