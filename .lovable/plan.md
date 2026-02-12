
# Phase 5.3 Completion: Integrate Standing Orders into Admin and Customer Portals

## Overview

The Standing Orders components (`StandingOrdersList`, `CreateStandingOrderDialog`, `CustomerStandingOrdersWidget`) and hook (`useStandingOrders`) are fully built but not wired into the application routes or navigation. This plan adds them to both portals.

## Changes

### 1. Create Admin Standing Orders Page

Create `src/pages/StandingOrdersPage.tsx` -- a simple page wrapper (following the pattern of `CustomersPage.tsx`) that renders the `StandingOrdersList` component with a "New Standing Order" dialog trigger.

### 2. Create Customer Standing Orders Page

Create `src/pages/CustomerStandingOrdersPage.tsx` -- renders the `CustomerStandingOrdersWidget` (non-compact mode) for the logged-in customer.

### 3. Add Routes to App.tsx

Add the following routes across all three route blocks (preview, admin-only, public-only) and native (HashRouter):

- **Admin**: `<Route path="standing-orders" element={<StandingOrdersPage />} />` under `/admin`
- **Customer Portal**: `<Route path="subscriptions" element={<CustomerStandingOrdersPage />} />` under `/portal`

This must be added in all 4 route definition blocks (HashRouter preview, HashRouter public, BrowserRouter preview, BrowserRouter admin, BrowserRouter public).

### 4. Add Navigation Links

- **Admin Sidebar** (`src/components/layout/AppSidebar.tsx`): Add "Standing Orders" with a `Calendar` icon to the `navigationItems` array (after "Order Issues").
- **Customer Navigation** (`src/components/customer/CustomerNavigation.tsx`): Add "Subscriptions" with a `Calendar` icon to the `navigationItems` array (after "Invoices").
- **Customer Desktop Sidebar** (`src/components/customer/navigation/DesktopSidebar.tsx`): Add "Subscriptions" entry.
- **Customer Tablet Navs** (`LargeTabletNav.tsx`, `TabletPillNav.tsx`): Add "Subscriptions" entry.

### 5. Add Widget to Customer Dashboard

In `src/pages/CustomerPortalMain.tsx`, embed the `CustomerStandingOrdersWidget` (compact mode) so customers see a quick summary of their active subscriptions on their dashboard.

## Technical Details

### New Files
| File | Purpose |
|------|---------|
| `src/pages/StandingOrdersPage.tsx` | Admin page wrapping `StandingOrdersList` + `CreateStandingOrderDialog` |
| `src/pages/CustomerStandingOrdersPage.tsx` | Customer page wrapping `CustomerStandingOrdersWidget` |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Add `standing-orders` and `subscriptions` routes in all route blocks |
| `src/components/layout/AppSidebar.tsx` | Add "Standing Orders" nav item with Calendar icon |
| `src/components/customer/CustomerNavigation.tsx` | Add "Subscriptions" nav item |
| `src/components/customer/navigation/DesktopSidebar.tsx` | Add "Subscriptions" nav item |
| `src/components/customer/navigation/LargeTabletNav.tsx` | Add "Subscriptions" nav item |
| `src/components/customer/navigation/TabletPillNav.tsx` | Add "Subscriptions" nav item |
| `src/pages/CustomerPortalMain.tsx` | Add compact `CustomerStandingOrdersWidget` |

### No Database Changes Required
The `standing_orders`, `standing_order_items`, and `standing_order_generations` tables and RPCs already exist from previous migrations.
