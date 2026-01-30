

# Phase 2.2 — Safe Bulk Operations Implementation Plan

## Overview

Phase 2.1 (Staff Ownership) is complete. This phase implements a **reusable bulk action framework** with low-risk operations only: bulk assign, bulk payment reminders, and bulk export.

---

## Current State

### Existing Infrastructure
| Component | Status | Notes |
|-----------|--------|-------|
| `BulkOrderActions.tsx` | Exists | Status updates with preview + confirmation pattern |
| `useBulkSelect` hook | Exists | Selection state management |
| `BulkSelectHeader/Cell` | Exists | Checkbox components |
| `DataExporter` class | Exists | CSV/Excel export utilities |
| `send-balance-payment-request` | Exists | Edge function for payment reminders |
| `useStaffMembers` hook | Exists | Fetch admin/sales_rep users |

### Gap Analysis
| Gap | Resolution |
|-----|------------|
| No generic bulk dialog framework | Create `BulkActionDialog.tsx` |
| No bulk assignment | Create `BulkAssignDialog.tsx` |
| No bulk payment reminders | Create `BulkPaymentReminderDialog.tsx` |
| Export exists but not in bulk toolbar | Integrate existing `DataExporter` |
| No row selection in orders table | Add checkboxes column |

---

## Implementation

### 2.2.1 Bulk Action Dialog Framework

**New File: `src/components/bulk/BulkActionDialog.tsx`**

A reusable dialog pattern for all bulk actions:

```typescript
interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectedItems: Array<{ id: string; identifier: string }>;
  onExecute: () => Promise<{ success: string[]; failed: { id: string; error: string }[] }>;
  onComplete: () => void;
  children?: React.ReactNode; // Configuration form
  confirmLabel?: string;
  destructive?: boolean;
}
```

**Features:**
- Shows selected item count and identifiers
- Requires explicit confirmation before execution
- Per-item success/failure reporting
- Logs batch audit event after completion
- Reusable across all bulk operations

---

### 2.2.2 Bulk Assign Dialog

**New File: `src/components/bulk/BulkAssignDialog.tsx`**

Assign multiple orders to a staff member:

```typescript
interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Array<{ id: string; order_number: string; assigned_to?: string }>;
  onComplete: () => void;
}
```

**Flow:**
1. Show preview: "Assign 5 orders to..."
2. Select staff member from `useStaffMembers()` dropdown
3. Confirm action
4. Execute per-order updates
5. Log `bulk_assignment` audit event
6. Show results summary

**Audit Log Entry:**
```typescript
{
  event_type: 'bulk_assignment',
  action: 'UPDATE',
  resource_type: 'orders',
  event_data: {
    total_orders: 5,
    assignee_id: 'uuid',
    assignee_name: 'John Doe',
    success_count: 4,
    failed_count: 1,
    order_numbers: ['ORD-001', 'ORD-002', ...]
  }
}
```

---

### 2.2.3 Bulk Payment Reminder Dialog

**New File: `src/components/bulk/BulkPaymentReminderDialog.tsx`**

Send payment reminder emails to multiple unpaid orders:

```typescript
interface BulkPaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Array<{ 
    id: string; 
    order_number: string; 
    payment_status?: string;
    balance_remaining?: number;
    customers?: { email?: string };
  }>;
  onComplete: () => void;
}
```

**Validation (Before Execution):**
- Filter out orders that are already `fully_paid`
- Filter out orders without customer email
- Show validation warnings in preview

**Flow:**
1. Validate eligible orders (has balance, has email)
2. Show preview with eligible vs. ineligible counts
3. Confirm action
4. Call `send-balance-payment-request` for each order
5. Log `bulk_payment_reminder` audit event
6. Show results

---

### 2.2.4 Bulk Export Integration

**New File: `src/components/bulk/BulkExportDialog.tsx`**

Export selected orders to CSV or Excel:

```typescript
interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Order[];
  onComplete: () => void;
}
```

**Features:**
- Format selection: CSV or Excel
- Uses existing `DataExporter.exportOrders()`
- No confirmation needed (read-only operation)
- Instant download on click

---

### 2.2.5 Bulk Actions Toolbar

**Modified File: `src/components/orders/OrdersDataTable.tsx`**

Add row selection and bulk action toolbar:

**Changes:**
1. Add checkbox column as first column
2. Integrate `useBulkSelect` hook for selection state
3. Add floating toolbar when items selected showing:
   - Selection count
   - "Assign" button → opens `BulkAssignDialog`
   - "Send Reminders" button → opens `BulkPaymentReminderDialog`
   - "Export" button → opens `BulkExportDialog`
   - "Clear" button

**Toolbar Design:**
```tsx
{selectedIds.length > 0 && (
  <div className="sticky top-0 z-10 flex items-center gap-2 p-3 bg-primary/10 border-b">
    <span className="font-medium">{selectedIds.length} selected</span>
    <div className="flex-1" />
    <Button variant="outline" size="sm">
      <UserPlus className="h-4 w-4 mr-2" />
      Assign
    </Button>
    <Button variant="outline" size="sm">
      <Mail className="h-4 w-4 mr-2" />
      Send Reminders
    </Button>
    <Button variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
    <Button variant="ghost" size="sm" onClick={clearSelection}>
      Clear
    </Button>
  </div>
)}
```

---

## Files Summary

### New Files (4)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `src/components/bulk/BulkActionDialog.tsx` | ~180 | Reusable bulk action framework |
| `src/components/bulk/BulkAssignDialog.tsx` | ~150 | Bulk assign orders to staff |
| `src/components/bulk/BulkPaymentReminderDialog.tsx` | ~160 | Bulk send payment reminders |
| `src/components/bulk/BulkExportDialog.tsx` | ~80 | Bulk export with format selection |

### Modified Files (2)

| File | Changes |
|------|---------|
| `src/components/orders/OrdersDataTable.tsx` | Add checkbox column, selection state, bulk toolbar |
| `src/components/orders/UnifiedOrdersManagement.tsx` | Pass bulk action handlers to data table |

---

## What This Implementation Does NOT Do

- Bulk delete (explicitly excluded)
- Bulk status override (risky - keep existing single-item flow)
- Bulk financial mutations
- Modify existing BulkOrderActions.tsx (keep it for status updates)

---

## Testing Checklist

- [ ] Checkbox column appears and toggles correctly
- [ ] Select all toggles all visible rows
- [ ] Bulk toolbar appears only when items selected
- [ ] Bulk assign shows staff selector and previews affected orders
- [ ] Bulk assign logs to audit_logs with correct metadata
- [ ] Bulk reminder filters out ineligible orders (fully paid, no email)
- [ ] Bulk reminder calls edge function for each order
- [ ] Bulk export downloads CSV/Excel with selected orders
- [ ] Per-item failures are reported clearly
- [ ] Clear selection resets state

---

## Success Criteria

Phase 2.2 is complete when:

1. Staff can select multiple orders via checkboxes
2. Bulk assign works with preview + confirmation
3. Bulk reminders validate and send correctly
4. Export works for selected subset
5. All bulk actions log to audit_logs
6. Failures are explicit and actionable

