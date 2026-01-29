

# Plan: Fix Partial Payment & Balance Reconciliation Workflow

## Executive Summary

This plan refactors the partial payment workflow to create a first-class, domain-level payment state system that correctly tracks deposits, balances, and order progression. The solution separates payment status from order status, introduces ledger-style payment tracking, and fixes all misleading notifications.

---

## Current State Analysis

### What Exists Today

| Component | Status | Issues |
|-----------|--------|--------|
| `payment_records` table | Exists but underutilized | Missing `payment_type` column (deposit/balance/adjustment) |
| `payment_amount_confirmed` | Single field on orders | Cannot track multiple payments properly |
| `payment_status_reason` | Text field for notes | Overloaded for partial payment messaging |
| Order status enum | `pending_payment`, `payment_received` | No explicit partial payment status |
| VerifyPaymentDialog | Has `isPartialPayment` checkbox | Keeps order in `pending_payment` which is misleading |
| Customer Portal | Shows "Balance Payment Required" alert | Order appears "stuck" because status doesn't progress |
| Notifications | "Payment Verified" message | Misleading when only deposit received |

### Root Cause

Payment state is embedded in order status rather than being a separate first-class concept. The system conflates "has the customer paid?" with "what stage is the order in the fulfillment process?"

---

## Solution Architecture

### Core Principle: Separate Payment Status from Order Status

```text
PAYMENT STATUS (financial state)     ORDER STATUS (fulfillment state)
================================     ================================
unpaid                               order_confirmed
partially_paid                  -->  processing
fully_paid                           ready_to_ship
                                     shipped
                                     delivered
```

These are orthogonal concerns. An order can be `processing` with `partially_paid`, or `ready_to_ship` with `fully_paid`.

---

## Phase 1: Database Schema Changes

### 1.1 Add `payment_status` Column to Orders Table

**New Migration: Add explicit payment status enum and column**

```sql
-- Create payment status enum
CREATE TYPE payment_status_enum AS ENUM (
  'unpaid',
  'partially_paid', 
  'fully_paid',
  'overpaid'
);

-- Add payment_status column to orders
ALTER TABLE orders ADD COLUMN payment_status payment_status_enum DEFAULT 'unpaid';

-- Add derived balance column for convenience
ALTER TABLE orders ADD COLUMN balance_remaining NUMERIC(12,2) GENERATED ALWAYS AS (
  total_amount - COALESCE(payment_amount_confirmed, 0)
) STORED;
```

### 1.2 Enhance `payment_records` Table

Add `payment_type` column to track deposit vs. balance payments:

```sql
-- Add payment type to payment_records
CREATE TYPE payment_type_enum AS ENUM ('deposit', 'balance', 'adjustment', 'refund');

ALTER TABLE payment_records ADD COLUMN payment_type payment_type_enum DEFAULT 'deposit';
ALTER TABLE payment_records ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE payment_records ADD COLUMN verified_by UUID REFERENCES auth.users(id);
ALTER TABLE payment_records ADD COLUMN proof_url TEXT;
```

### 1.3 Backfill Existing Data

```sql
-- Set payment_status based on current payment_amount_confirmed
UPDATE orders SET payment_status = 
  CASE 
    WHEN payment_amount_confirmed IS NULL OR payment_amount_confirmed = 0 THEN 'unpaid'
    WHEN payment_amount_confirmed < total_amount THEN 'partially_paid'
    WHEN payment_amount_confirmed >= total_amount THEN 'fully_paid'
    ELSE 'unpaid'
  END;
```

---

## Phase 2: Payment Verification Dialog Refactor

### 2.1 Update VerifyPaymentDialog.tsx

**File: `src/components/orders/VerifyPaymentDialog.tsx`**

Key changes:
- Remove `isPartialPayment` checkbox (auto-detect from amount)
- Update order with correct `payment_status` enum value
- For partial payments, allow order to progress to `processing` while payment_status stays `partially_paid`
- Create proper payment_record entry with `payment_type: 'deposit'` or `'balance'`

**Updated logic:**

```typescript
// Determine payment status based on amount
const totalPaid = (order.payment_amount_confirmed || 0) + parsedAmount;
const paymentStatus = totalPaid >= invoiceTotal ? 'fully_paid' : 'partially_paid';
const isFullPayment = paymentStatus === 'fully_paid';

// Update order
const orderUpdateData = {
  // Don't change order status based on payment - let admin decide
  payment_status: paymentStatus,
  payment_amount_confirmed: totalPaid,
  payment_verified_at: new Date().toISOString(),
  // Clear rejection if any
  payment_rejected_at: null,
  payment_status_reason: null,
};

// Create payment record as ledger entry
await supabase.from('payment_records').insert({
  order_id: order.id,
  amount: parsedAmount,
  payment_type: order.payment_amount_confirmed > 0 ? 'balance' : 'deposit',
  payment_date: paymentDate,
  payment_method: paymentMethod,
  payment_reference: paymentReference,
  verified_at: new Date().toISOString(),
  verified_by: user.id,
  proof_url: order.payment_proof_url,
});
```

### 2.2 Add "Verify Balance Payment" Action

When a customer uploads a second payment proof (balance), admin sees a dedicated "Verify Balance" action that:
1. Recognizes this is a balance payment (existing payment_amount_confirmed > 0)
2. Shows previous payments summary
3. Updates payment_status to `fully_paid` when complete
4. Emits `order_fully_paid` system event

---

## Phase 3: Order State Machine Updates

### 3.1 Update Order Status Guards

**File: `src/components/orders/OrdersDataTable.tsx`**

Update shipping guards to check `payment_status` instead of parsing `payment_status_reason`:

```typescript
// Current (broken): checks text in payment_status_reason
const hasVerifiedPartialPayment = (order) => {
  return order.payment_status_reason?.toLowerCase().includes('partial');
};

// Fixed: check payment_status enum
const hasPartialPayment = (order) => {
  return order.payment_status === 'partially_paid';
};

const canShip = (order) => {
  return order.payment_status === 'fully_paid';
};
```

### 3.2 Allow Processing with Partial Payment

Orders can progress through preparation stages after deposit:
- `order_confirmed` -> `processing`: Allowed after deposit verified
- `processing` -> `ready_to_ship`: Allowed (but shipping blocked)
- `ready_to_ship` -> `shipped`: **BLOCKED** until `payment_status = 'fully_paid'`

### 3.3 Add New Admin Actions

**In OrdersDataTable dropdown menu:**

| Current Status | payment_status | Available Actions |
|----------------|----------------|-------------------|
| pending_payment | unpaid | Verify Payment |
| pending_payment | partially_paid | Verify Balance, Request Balance, Move to Processing |
| processing | partially_paid | Request Balance, Resend Request |
| processing | fully_paid | Mark Ready to Ship |
| ready_to_ship | partially_paid | (blocked) Request Balance First |
| ready_to_ship | fully_paid | Mark Shipped |

---

## Phase 4: Customer Portal UX Fixes

### 4.1 Update CustomerOrders.tsx

**File: `src/components/customer/CustomerOrders.tsx`**

Replace current partial payment detection with enum check:

```typescript
// Current (fragile)
const hasPartialPayment = (order) => {
  const confirmedAmount = order.payment_amount_confirmed || 0;
  return confirmedAmount > 0 && confirmedAmount < order.total_amount;
};

// Fixed (uses enum)
const hasPartialPayment = (order) => order.payment_status === 'partially_paid';
const isFullyPaid = (order) => order.payment_status === 'fully_paid';
```

### 4.2 Add Payment Summary Card

Create new component showing:
- Total order amount
- Amount paid (sum of all payment_records)
- Balance remaining
- Payment history (list of payments with dates)

```tsx
<PaymentSummaryCard 
  order={order}
  payments={paymentRecords}
  showUploadButton={order.payment_status !== 'fully_paid'}
/>
```

### 4.3 Fix Order Timeline Progression

Update `OrderTimeline` to show progress after deposit:
- Order can visually progress through "Being Prepared" even with partial payment
- Only "Ready for Dispatch" and "Shipped" stages show lock icon if not fully paid

### 4.4 Update CTA Logic

```typescript
// Upload Balance Payment CTA (when partially_paid)
{order.payment_status === 'partially_paid' && (
  <Button onClick={() => openPaymentDialog(order)}>
    <Upload className="mr-2" />
    Upload Balance Payment ({order.currency} {order.balance_remaining})
  </Button>
)}

// No payment CTA when fully paid
{order.payment_status === 'fully_paid' && (
  <Badge className="bg-green-100 text-green-800">
    <CheckCircle className="mr-1" />
    Fully Paid
  </Badge>
)}
```

---

## Phase 5: Notification System Refactor

### 5.1 New Event Types

Add to `ActionEventService.ts`:

```typescript
type ActionEventType = 
  // Existing
  | 'payment_required'
  // New payment events
  | 'deposit_received'        // Customer: "Deposit of X received, balance Y remaining"
  | 'deposit_verified'        // Customer: "Deposit verified, order proceeding"
  | 'balance_requested'       // Customer: "Balance payment of X required for shipping"
  | 'balance_received'        // Admin: "Balance payment uploaded for order X"
  | 'balance_verified'        // Customer: "Balance verified, order cleared for shipping"
  | 'order_fully_paid';       // Both: System event for analytics/triggers
```

### 5.2 Update Notification Messages

**Replace misleading notifications:**

| Event | Old Message | New Message |
|-------|------------|-------------|
| Partial payment verified | "Payment Verified - Order Processing" | "Deposit Received - Balance of {amount} remaining" |
| Balance requested | (none) | "Balance Payment Required - Order ready for shipping once paid" |
| Balance verified | "Payment Verified" | "Full Payment Confirmed - Order cleared for shipping" |

### 5.3 Add New Edge Function Methods

**File: `src/services/actionEventService.ts`**

```typescript
static async emitDepositVerified(
  userId: string,
  orderId: string,
  orderNumber: string,
  depositAmount: number,
  balanceRemaining: number,
  currency: string
): Promise<boolean>;

static async emitBalanceRequested(
  userId: string,
  orderId: string,
  orderNumber: string,
  balanceAmount: number,
  currency: string
): Promise<boolean>;

static async emitOrderFullyPaid(
  orderId: string,
  orderNumber: string,
  totalAmount: number,
  currency: string
): Promise<boolean>;
```

### 5.4 Update send-payment-confirmation Edge Function

**File: `supabase/functions/send-payment-confirmation/index.ts`**

Add payment type awareness:

```typescript
interface PaymentConfirmationRequest {
  orderId: string;
  orderNumber: string;
  paymentType: 'deposit' | 'balance' | 'full';  // New
  amountReceived: number;
  totalPaid: number;
  balanceRemaining: number;
  isOrderFullyPaid: boolean;  // New
}
```

Update email templates for each payment type.

---

## Phase 6: Admin Reconciliation Flow

### 6.1 Create Balance Verification Dialog

**New File: `src/components/orders/VerifyBalancePaymentDialog.tsx`**

Similar to VerifyPaymentDialog but:
- Shows payment history (previous deposits)
- Shows expected balance amount
- Auto-calculates if this completes the payment
- On verify, sets `payment_status = 'fully_paid'`
- Emits `balance_verified` and `order_fully_paid` events

### 6.2 Add Payment History Panel

**New File: `src/components/orders/PaymentHistoryPanel.tsx`**

Shows all payments for an order:
- Date, amount, method, reference
- Verified by, verification date
- Running total
- Balance remaining

### 6.3 Update Finance Reconciliation Page

**File: `src/components/finance/ReconciliationDashboard.tsx`**

Add partial payment tracking:
- Filter: "Awaiting Balance"
- Show orders with `payment_status = 'partially_paid'`
- Show days since last payment
- Action: "Send Balance Reminder"

---

## Phase 7: System Events and Audit Logging

### 7.1 Add Database Trigger for payment_status Changes

```sql
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO audit_logs (
      event_type,
      resource_type,
      resource_id,
      event_data
    ) VALUES (
      CASE NEW.payment_status
        WHEN 'partially_paid' THEN 'deposit_verified'
        WHEN 'fully_paid' THEN 'order_fully_paid'
        ELSE 'payment_status_changed'
      END,
      'order',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.payment_status,
        'new_status', NEW.payment_status,
        'amount_confirmed', NEW.payment_amount_confirmed,
        'total_amount', NEW.total_amount
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_status_audit
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION log_payment_status_change();
```

### 7.2 Auto-Resolve Notifications on Full Payment

```sql
-- Trigger to resolve balance_requested notifications when fully paid
CREATE OR REPLACE FUNCTION resolve_payment_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'fully_paid' AND OLD.payment_status != 'fully_paid' THEN
    UPDATE user_notifications
    SET resolved = TRUE, resolved_at = NOW()
    WHERE entity_id = NEW.id 
      AND entity_type = 'order'
      AND type IN ('balance_requested', 'payment_required', 'balance_payment_request')
      AND resolved = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_resolve_payment_notifications
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION resolve_payment_notifications();
```

---

## Implementation Files Summary

| File | Action | Description |
|------|--------|-------------|
| **Database** | | |
| New migration | Create | Add payment_status enum, column, enhance payment_records |
| **Backend** | | |
| `send-payment-confirmation/index.ts` | Update | Add payment type awareness, separate templates |
| `send-balance-payment-request/index.ts` | Update | Use new notification types |
| **Frontend - Orders Admin** | | |
| `VerifyPaymentDialog.tsx` | Update | Auto-detect partial, create ledger entry, set payment_status |
| `VerifyBalancePaymentDialog.tsx` | Create | Dedicated balance verification flow |
| `PaymentHistoryPanel.tsx` | Create | Show all payments for order |
| `OrdersDataTable.tsx` | Update | Use payment_status enum for guards, add new actions |
| `UnifiedOrdersManagement.tsx` | Update | Add balance verification handlers |
| **Frontend - Customer Portal** | | |
| `CustomerOrders.tsx` | Update | Use payment_status enum, show payment summary |
| `PaymentSummaryCard.tsx` | Create | Order payment breakdown UI |
| `OrderTimeline.tsx` | Update | Allow progress with partial payment, lock shipping stages |
| `OrderStatusBadge.tsx` | Update | Add partially_paid badge variant |
| **Services** | | |
| `actionEventService.ts` | Update | Add new event types and emit methods |
| `notificationService.ts` | Update | Update message templates |
| **Types** | | |
| `src/types/payment.ts` | Create | TypeScript types for payment_status, payment_type |

---

## Testing Checklist

After implementation, verify:

1. **Deposit Flow**
   - [ ] Customer uploads payment proof
   - [ ] Admin verifies as partial payment
   - [ ] Order moves to `processing` with `payment_status = 'partially_paid'`
   - [ ] Customer sees "Deposit Received, Balance Required" message (not "Payment Verified")
   - [ ] Customer portal shows payment summary with balance

2. **Balance Flow**
   - [ ] Customer can upload second payment proof
   - [ ] Admin sees "Verify Balance" action
   - [ ] Admin verifies, order becomes `fully_paid`
   - [ ] Customer sees "Full Payment Confirmed" message
   - [ ] Shipping actions unblock

3. **Shipping Guards**
   - [ ] Cannot ship order with `payment_status = 'partially_paid'`
   - [ ] Guard shows tooltip: "Full payment required (X remaining)"
   - [ ] Can ship when `payment_status = 'fully_paid'`

4. **Notifications**
   - [ ] Deposit verified → customer notified with balance amount
   - [ ] Balance requested → customer notified with amount and deep link
   - [ ] Balance verified → customer notified, order cleared

5. **Order Progression**
   - [ ] Order doesn't appear "stuck" after deposit
   - [ ] Timeline shows progress through preparation stages
   - [ ] Only shipping stages show payment gate

---

## Backward Compatibility

- Existing orders retain their current state
- Migration backfills payment_status from payment_amount_confirmed
- Old notification types continue to work
- No breaking changes to API contracts

---

## Configuration (Future Enhancement)

**Per-tenant settings (optional, not in initial scope):**

```typescript
interface PaymentConfig {
  allowProcessingAfterDeposit: boolean;  // Default: true
  minimumDepositPercent: number;         // Default: 30
  balanceReminderDays: number;           // Default: 7
  autoBlockShippingIfBalancePending: boolean;  // Default: true
}
```

This can be added later via the `payment_settings` table.

