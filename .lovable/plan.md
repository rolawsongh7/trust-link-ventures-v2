

# Phase 2.3 — Operational Dashboards Implementation Plan

## Executive Summary

Phase 2.1 (Staff Ownership) and Phase 2.2 (Safe Bulk Operations) are complete. Phase 2.3 introduces **queue-style operational dashboards** that allow staff to run daily operations without needing BI charts or founder oversight.

---

## Current State Assessment

### Existing Infrastructure
| Component | Status | Notes |
|-----------|--------|-------|
| `OperationsIntelligence.tsx` | Exists | Analytics-focused, has bottleneck + at-risk detection |
| `useOrdersQuery` hook | Exists | Fetches all orders with relationships |
| `useNavigationCounts` hook | Exists | Badge counts for sidebar |
| `AssignmentFilters` | Exists (Phase 2.1) | My Queue / Unassigned filter logic |
| `useStaffMembers` hook | Exists (Phase 2.1) | Fetches admin staff list |
| `AppSidebar.tsx` | Exists | Navigation with badge support |
| Order timestamp fields | Exists | `created_at`, `shipped_at`, `delivered_at`, `ready_to_ship_at`, etc. |

### Gap Analysis
| Gap | Resolution |
|-----|------------|
| No queue-style ops dashboard | Create `OperationsHub.tsx` page |
| No dedicated SLA helpers | Create `src/utils/slaHelpers.ts` |
| No SLA badge component | Create `SLABadge.tsx` component |
| No staff workload visibility | Create `WorkloadSummary.tsx` component |
| No sidebar link to Operations | Add to `AppSidebar.tsx` |
| No route for /admin/operations | Add to `App.tsx` |

---

## Implementation

### 2.3.1 SLA Helpers Utility

**New File: `src/utils/slaHelpers.ts`**

Core utility for calculating SLA status based on order state and timestamps:

```typescript
type SLAStatus = 'on_track' | 'at_risk' | 'breached';

interface SLAResult {
  status: SLAStatus;
  reason: string;
  daysInStage: number;
  expectedDays: number;
}

// SLA thresholds per status
const SLA_THRESHOLDS = {
  pending_payment: 3,     // 3 days to receive payment
  payment_received: 1,    // 1 day to start processing
  processing: 2,          // 2 days to complete processing
  ready_to_ship: 1,       // 1 day to dispatch
  shipped: 7,             // 7 days to deliver
};

export function calculateSLA(order: Order): SLAResult;
export function getStageEntryDate(order: Order): Date | null;
export function getDaysInCurrentStage(order: Order): number;
```

**Key Design:**
- Calculate time in current stage using status-specific timestamps
- Compare against thresholds to determine on_track/at_risk/breached
- Return human-readable reason for status

---

### 2.3.2 SLA Badge Component

**New File: `src/components/operations/SLABadge.tsx`**

Visual indicator for SLA status:

```typescript
interface SLABadgeProps {
  order: Order;
  showReason?: boolean;
}
```

**Visual States:**
- **Green (On Track)**: Within expected time
- **Amber (At Risk)**: Approaching threshold (>75% of expected time)
- **Red (Breached)**: Past threshold

---

### 2.3.3 Operations Hub Page

**New File: `src/pages/admin/OperationsHub.tsx`**

A queue-style dashboard with tabbed views:

| Tab | Query Logic | Sort Order |
|-----|-------------|------------|
| Awaiting Payment | `status = 'pending_payment'` | Oldest first |
| Awaiting Processing | `status IN ('payment_received', 'order_confirmed')` | Oldest first |
| At Risk | SLA status = at_risk OR breached | Urgency score |
| Unassigned | `assigned_to IS NULL` AND status not terminal | Created date |
| My Queue | `assigned_to = current_user` | SLA urgency |

**Each Row Displays:**
- Order number + Customer
- Status badge
- SLA badge
- Assignee badge (or "Unassigned")
- Days in stage
- Primary action button (context-sensitive)
- Blocker reason (if applicable)

**Header KPIs (4 cards):**
1. Total Active Orders (not delivered/cancelled)
2. At Risk Count (red if > 0)
3. Unassigned Count (amber if > 5)
4. Avg Days to Complete

---

### 2.3.4 Queue Row Component

**New File: `src/components/operations/OperationsQueueRow.tsx`**

Reusable row for queue views:

```typescript
interface OperationsQueueRowProps {
  order: Order;
  onAction: (order: Order, action: string) => void;
}
```

**Row Structure:**
```text
| [Checkbox] | Order # | Customer | Status | SLA | Assignee | Days | [Action] |
```

**Action Buttons (context-sensitive):**
- Pending Payment → "Verify Payment"
- Payment Received → "Start Processing"
- Ready to Ship → "Mark Shipped"
- Unassigned → "Assign"

---

### 2.3.5 Staff Workload Summary

**New File: `src/components/operations/WorkloadSummary.tsx`**

Admin-only component showing order distribution across staff:

```typescript
interface WorkloadSummaryProps {
  orders: Order[];
  staffMembers: StaffMember[];
}
```

**Display:**
- List of staff members with assigned order counts
- Visual indicator: Overloaded (>10) / Balanced (5-10) / Light (<5)
- Unassigned count prominently displayed
- Purely informational, no actions

---

### 2.3.6 Navigation Updates

**Modified File: `src/components/layout/AppSidebar.tsx`**

Add "Operations" link to navigation:

```typescript
// Add to navigationItems array (after Orders)
{ 
  title: 'Operations', 
  url: '/admin/operations', 
  icon: Activity, 
  badge: 'atRisk' as const 
},
```

**Modified File: `src/hooks/useNavigationCounts.tsx`**

Add at-risk count:

```typescript
interface NavigationCounts {
  // ... existing
  atRisk: number;
}

// Query for at-risk orders
const atRiskCount = orders.filter(o => 
  calculateSLA(o).status !== 'on_track' && 
  !['delivered', 'cancelled'].includes(o.status)
).length;
```

**Modified File: `src/App.tsx`**

Add route for Operations Hub:

```typescript
<Route path="operations" element={<OperationsHub />} />
```

---

## Files Summary

### New Files (5)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `src/utils/slaHelpers.ts` | ~100 | SLA calculation utilities |
| `src/components/operations/SLABadge.tsx` | ~50 | SLA status badge component |
| `src/components/operations/OperationsQueueRow.tsx` | ~120 | Queue row with actions |
| `src/components/operations/WorkloadSummary.tsx` | ~100 | Staff workload visibility |
| `src/pages/admin/OperationsHub.tsx` | ~400 | Main operations dashboard |

### Modified Files (3)

| File | Changes |
|------|---------|
| `src/components/layout/AppSidebar.tsx` | Add "Operations" nav item |
| `src/hooks/useNavigationCounts.tsx` | Add atRisk count |
| `src/App.tsx` | Add /admin/operations route (3 locations) |

---

## Design Decisions

### Queue vs Chart Philosophy
The Operations Hub deliberately avoids charts. Each view is a **work queue** showing:
- What needs attention NOW
- Why it needs attention
- Who owns it
- What the next action is

Staff should be able to clear queues without interpreting analytics.

### SLA Is Read-Only
SLA indicators are purely informational:
- No penalties
- No automated escalation
- No notifications (yet)

This builds awareness before introducing automation in Phase 3.

### Relationship to Existing OperationsIntelligence
The existing `OperationsIntelligence.tsx` component in Advanced Analytics is **strategic** (bottleneck patterns, cycle times). The new `OperationsHub.tsx` is **tactical** (what to do right now). They complement each other:
- OperationsHub → Daily staff work
- OperationsIntelligence → Management review

---

## Implementation Order

| Step | Scope | Dependencies |
|------|-------|--------------|
| 1 | Create `slaHelpers.ts` | None |
| 2 | Create `SLABadge.tsx` | Step 1 |
| 3 | Create `OperationsQueueRow.tsx` | Steps 1-2 |
| 4 | Create `WorkloadSummary.tsx` | useStaffMembers |
| 5 | Create `OperationsHub.tsx` | Steps 1-4 |
| 6 | Update sidebar + routing | Step 5 |
| 7 | Update useNavigationCounts | Step 1 |

---

## Testing Checklist

- [ ] SLA calculation returns correct status for each order stage
- [ ] SLA badge displays correct color (green/amber/red)
- [ ] Operations Hub loads with all tabs
- [ ] "Awaiting Payment" tab shows correct orders
- [ ] "At Risk" tab surfaces orders past SLA threshold
- [ ] "My Queue" tab shows only assigned orders
- [ ] "Unassigned" tab shows orders without assignee
- [ ] Primary action buttons are context-appropriate
- [ ] Workload summary shows staff distribution
- [ ] Sidebar "Operations" link appears with badge
- [ ] Badge count updates when at-risk orders change
- [ ] Clicking row navigates to order detail

---

## Success Criteria

Phase 2.3 is complete when:

1. Staff can work from queues (not charts)
2. At-risk orders surface automatically
3. SLA status is visible on every order
4. Workload distribution is transparent
5. No BI/analytics knowledge needed for daily ops
6. Problems surface themselves through badge counts

