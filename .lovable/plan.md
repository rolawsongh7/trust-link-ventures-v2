

# Phase 2 — Scale Readiness Implementation Plan

## Executive Summary

Phase 1.5 (Money Flows & Ops Stabilization) is verified complete. Phase 2 prepares the system for scaling operations by introducing **staff ownership**, **safe bulk operations**, and **operator-grade dashboards** — without adding new features or changing permissions.

---

## Current State Assessment

### Existing Infrastructure
| Component | Status | Notes |
|-----------|--------|-------|
| `user_roles` table | Exists | Supports super_admin, admin, sales_rep, user |
| `useRoleAuth` hook | Exists | Role checking via `check_user_role` RPC |
| `audit_logs` table | Exists | Comprehensive event logging |
| `BulkOrderActions` component | Exists | Status updates with preview + confirmation |
| Order state machine | Hardened | Validated in Phase 1.5 |
| RLS policies | Secure | Verified in Phase 1.5 |

### Gaps to Fill for Phase 2
| Gap | Impact | Phase |
|-----|--------|-------|
| No `assigned_to` on orders, quotes, order_issues | Cannot track ownership | 2.1 |
| Bulk actions limited to status updates only | Cannot assign or export in bulk | 2.2 |
| No operational queue views | Staff need BI charts to work | 2.3 |
| No SLA tracking | At-risk orders invisible | 2.3 |

---

## Phase 2.1 — Staff Ownership (Foundation)

### 2.1.1 Database: Add Ownership Fields

**Migration: Add `assigned_to` Columns**

```sql
-- Add assigned_to to orders (nullable, references profiles)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Add assigned_to to quotes
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Add assigned_to to order_issues
ALTER TABLE public.order_issues 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- Create indexes for filtering by assignee
CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to ON public.quotes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_order_issues_assigned_to ON public.order_issues(assigned_to);
```

**Key Design Decisions:**
- Assignment is **informational only** — no permission changes
- Nullable (unassigned is valid)
- References `auth.users` for profile lookup

### 2.1.2 UI: Assignment Components

**New Files:**

| File | Purpose |
|------|---------|
| `src/components/assignment/AssigneeSelector.tsx` | Dropdown to select staff member |
| `src/components/assignment/AssigneeBadge.tsx` | Display current assignee with avatar |
| `src/components/assignment/AssignmentFilters.tsx` | "Assigned to me" / "Unassigned" filters |

**AssigneeSelector Component:**
- Fetches admin/sales_rep users from `user_roles` + `profiles`
- Dropdown with user avatars and names
- Calls update API on selection
- Logs to `audit_logs` on change

**AssigneeBadge Component:**
- Shows avatar + name of assignee
- Tooltip with full name and role
- "Unassigned" state with different styling

### 2.1.3 Integration Points

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/orders/OrdersDataTable.tsx` | Add "Assigned" column, AssigneeBadge |
| `src/components/orders/UnifiedOrdersManagement.tsx` | Add assignment filters to tabs |
| `src/pages/admin/OrderIssues.tsx` | Add AssigneeBadge, assignment action |
| `src/pages/QuotesPage.tsx` | Add AssigneeBadge to quote list |

### 2.1.4 Audit Logging for Assignments

```typescript
// Log assignment changes
await supabase.from('audit_logs').insert({
  user_id: currentUser.id,
  event_type: 'assignment_changed',
  action: 'UPDATE',
  resource_type: 'orders', // or 'quotes', 'order_issues'
  resource_id: entityId,
  event_data: {
    previous_assignee: previousAssigneeId,
    new_assignee: newAssigneeId,
    entity_type: 'order',
    entity_number: order.order_number,
  },
  severity: 'low',
});
```

---

## Phase 2.2 — Safe Bulk Operations

### 2.2.1 Bulk Action Framework

**New File: `src/components/bulk/BulkActionDialog.tsx`**

A reusable framework for all bulk actions:

```typescript
interface BulkActionConfig {
  title: string;
  description: string;
  entityType: 'orders' | 'quotes' | 'order_issues';
  action: 'assign' | 'export' | 'remind';
  validator?: (items: any[]) => { valid: any[]; invalid: { id: string; reason: string }[] };
  executor: (items: any[], params: any) => Promise<BulkResult>;
}

interface BulkResult {
  success: string[];
  failed: { id: string; error: string }[];
}
```

**Flow:**
1. Select records (checkbox)
2. Click bulk action button
3. Show preview dialog with count + identifiers
4. Configure action (select assignee, etc.)
5. Require explicit confirmation
6. Execute with per-item error handling
7. Log batch audit event
8. Show success/failure summary

### 2.2.2 Allowed Bulk Actions

**Phase 2.2 Scope (Low-Risk Only):**

| Action | Description | Files |
|--------|-------------|-------|
| Bulk Assign | Assign multiple orders/issues to staff | `BulkAssignDialog.tsx` |
| Bulk Payment Reminder | Send reminder emails for unpaid orders | `BulkPaymentReminderDialog.tsx` |
| Bulk Export | Export selected records to CSV/Excel | `BulkExportDialog.tsx` |

**Explicitly NOT Included:**
- Bulk delete
- Bulk status override
- Bulk financial mutations

### 2.2.3 New Components

| File | Purpose |
|------|---------|
| `src/components/bulk/BulkAssignDialog.tsx` | Assign orders/issues to staff |
| `src/components/bulk/BulkPaymentReminderDialog.tsx` | Send payment reminders |
| `src/components/bulk/BulkExportDialog.tsx` | Export with format selection |

### 2.2.4 Integration

**Modified Files:**

| File | Changes |
|------|---------|
| `src/components/orders/UnifiedOrdersManagement.tsx` | Add bulk action toolbar |
| `src/components/orders/OrdersDataTable.tsx` | Add row selection checkboxes |
| `src/pages/admin/OrderIssues.tsx` | Add bulk assign to issues |

---

## Phase 2.3 — Operational Dashboards

### 2.3.1 Ops Queue Views

**New File: `src/pages/admin/OperationsHub.tsx`**

A queue-style dashboard with tabs:

| Tab | Shows | Sort |
|-----|-------|------|
| Awaiting Payment | Orders in `pending_payment` status | Oldest first |
| Awaiting Processing | Orders in `payment_received` status | Oldest first |
| At Risk | Orders flagged for SLA/payment issues | Urgency score |
| Unassigned | Orders/issues without assignee | Created date |
| My Queue | Items assigned to current user | Due date |

**Each Row Must Answer:**
- What is wrong? (Status + blocker)
- Why? (Reason tooltip)
- Who owns it? (Assignee badge)
- What's next? (Primary action button)

### 2.3.2 SLA Indicators (Read-Only)

**New Utility: `src/utils/slaHelpers.ts`**

```typescript
type SLAStatus = 'on_track' | 'at_risk' | 'breached';

interface SLAResult {
  status: SLAStatus;
  reason: string;
  daysRemaining?: number;
}

// SLA Rules (configurable later)
const SLA_THRESHOLDS = {
  payment_pending_max_days: 3,
  processing_max_days: 2,
  ready_to_ship_max_days: 1,
  delivery_max_days: 7,
};

export function calculateSLA(order: Order): SLAResult {
  // Calculate based on status and timestamps
  // Returns on_track, at_risk, or breached
}
```

**SLA Badge Component:**
- Green: On Track
- Amber: At Risk (approaching threshold)
- Red: Breached (past threshold)

**No Penalties. No Automation. Just Visibility.**

### 2.3.3 Staff Workload Visibility

**New Component: `src/components/admin/WorkloadSummary.tsx`**

Admin-only view showing:
- Orders per staff member
- Issues per staff member
- Visual indicator: Overloaded / Balanced / Idle

**Not a Performance Tracker** — purely operational load balancing.

### 2.3.4 Navigation Updates

**Modified File: `src/App.tsx` or routing config**

Add new route: `/admin/operations` → `OperationsHub`

**Modified File: Admin sidebar**

Add "Operations" link with badge for at-risk count.

---

## Phase 2.4 — Scale Safety & Hardening

### 2.4.1 Defensive Action Guards

**New Utility: `src/utils/actionGuards.ts`**

```typescript
interface ActionGuard {
  allowed: boolean;
  reason?: string;
  suggestedAction?: string;
}

// Check if user can perform action on entity
export function canPerformAction(
  user: User,
  entity: Order | Issue,
  action: 'assign' | 'update_status' | 'reassign'
): ActionGuard {
  // Owner check (unless admin)
  if (entity.assigned_to && entity.assigned_to !== user.id) {
    if (!isAdmin(user)) {
      return {
        allowed: false,
        reason: 'This item is assigned to another team member',
        suggestedAction: 'Contact admin to reassign',
      };
    }
  }
  return { allowed: true };
}
```

### 2.4.2 Rate Awareness (Soft Warnings)

**New Hook: `src/hooks/useBulkActionTracking.ts`**

Track bulk action frequency per user per hour:

```typescript
const THRESHOLDS = {
  bulk_actions_per_hour: 10,
  failed_actions_per_hour: 5,
};

// Warn (don't block) when approaching limits
function trackBulkAction(action: string, count: number) {
  // Store in localStorage or state
  // Return warning if approaching threshold
}
```

**Displays warning toast, does not block.**

---

## Implementation Order

| Phase | Scope | Dependencies |
|-------|-------|--------------|
| 2.1.1 | Database migration (assigned_to columns) | None |
| 2.1.2 | AssigneeSelector, AssigneeBadge components | 2.1.1 |
| 2.1.3 | Integrate into OrdersDataTable, OrderIssues | 2.1.2 |
| 2.1.4 | Assignment audit logging | 2.1.3 |
| 2.2.1 | BulkActionDialog framework | 2.1 complete |
| 2.2.2 | BulkAssignDialog | 2.2.1 |
| 2.2.3 | BulkPaymentReminderDialog, BulkExportDialog | 2.2.1 |
| 2.3.1 | OperationsHub page | 2.1 + 2.2 complete |
| 2.3.2 | SLA helpers and badges | 2.3.1 |
| 2.3.3 | WorkloadSummary component | 2.3.1 |
| 2.4.1 | Action guards utility | 2.3 complete |
| 2.4.2 | Bulk action tracking hook | 2.4.1 |

---

## Files Summary

### New Files (13)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `supabase/migrations/xxx_add_assignment_fields.sql` | ~20 | Add assigned_to columns |
| `src/components/assignment/AssigneeSelector.tsx` | ~100 | Staff picker dropdown |
| `src/components/assignment/AssigneeBadge.tsx` | ~60 | Display assignee |
| `src/components/assignment/AssignmentFilters.tsx` | ~50 | Filter by assignment |
| `src/components/bulk/BulkActionDialog.tsx` | ~150 | Reusable bulk action framework |
| `src/components/bulk/BulkAssignDialog.tsx` | ~120 | Bulk assign orders/issues |
| `src/components/bulk/BulkPaymentReminderDialog.tsx` | ~100 | Bulk send reminders |
| `src/components/bulk/BulkExportDialog.tsx` | ~80 | Bulk export to CSV/Excel |
| `src/pages/admin/OperationsHub.tsx` | ~300 | Queue-style ops dashboard |
| `src/utils/slaHelpers.ts` | ~80 | SLA calculation utilities |
| `src/components/admin/WorkloadSummary.tsx` | ~120 | Staff workload visibility |
| `src/utils/actionGuards.ts` | ~60 | Defensive action checks |
| `src/hooks/useBulkActionTracking.ts` | ~50 | Rate awareness tracking |

### Modified Files (8)

| File | Changes |
|------|---------|
| `src/integrations/supabase/types.ts` | Auto-updated by migration |
| `src/components/orders/OrdersDataTable.tsx` | Add Assigned column, checkboxes |
| `src/components/orders/UnifiedOrdersManagement.tsx` | Add bulk toolbar, filters |
| `src/pages/admin/OrderIssues.tsx` | Add assignment, bulk actions |
| `src/pages/QuotesPage.tsx` | Add assignment badge |
| `src/App.tsx` | Add /admin/operations route |
| `src/components/admin/Sidebar.tsx` | Add Operations nav link |
| `src/hooks/useNavigationCounts.tsx` | Add at-risk count |

---

## Testing Checklist

### Phase 2.1 Tests
- [ ] Can assign order to staff member
- [ ] Assignment badge displays correctly
- [ ] "Assigned to me" filter works
- [ ] "Unassigned" filter works
- [ ] Reassignment logs to audit

### Phase 2.2 Tests
- [ ] Bulk assign shows preview with count
- [ ] Confirmation required before execution
- [ ] Per-item failures are reported
- [ ] Successful items proceed
- [ ] Audit log captures batch event

### Phase 2.3 Tests
- [ ] Ops Hub loads with queues
- [ ] At-risk orders surface correctly
- [ ] SLA indicators calculate correctly
- [ ] Workload summary shows staff load

### Phase 2.4 Tests
- [ ] Non-owners see warning on assigned items
- [ ] Admins can override ownership
- [ ] Rate warning appears after threshold

### Regression Tests
- [ ] Phase 1.5 money flows still work
- [ ] Admin can still manage orders
- [ ] Customer cannot see other customers
- [ ] No RLS policies broken
- [ ] No role logic changed

---

## What This Plan Does NOT Do

- Does not add new user roles
- Does not change existing permissions
- Does not add customer-facing features
- Does not modify pricing/billing
- Does not introduce AI automation
- Does not weaken RLS or RPCs
- Does not refactor Phase 1.5 logic

---

## Success Criteria

Phase 2 is complete when:

1. Staff know what they own (assignments visible)
2. Bulk actions are safe and auditable
3. Ops dashboards replace founder oversight
4. Problems surface themselves (SLA awareness)
5. Mistakes are harder to make (guards active)
6. Phase 1.5 logic is untouched and verified

