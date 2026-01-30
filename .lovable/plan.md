
# Money Flows & Ops Stabilization Plan (Phase 1.5)

## Executive Summary

The existing payment and order infrastructure is **fundamentally sound**. This plan focuses on **hardening, gap-filling, and UX clarity** - not rewriting existing logic.

---

## Current State Assessment

### What's Already Working
| Component | Status | Notes |
|-----------|--------|-------|
| `payment_status` enum | Exists | unpaid, partially_paid, fully_paid, overpaid |
| `balance_remaining` column | Exists | Auto-calculated via trigger |
| `validate_order_status_transition()` | Exists | Blocks shipping without full payment |
| `payment_records` ledger | Exists | Tracks deposit, balance, adjustment, refund |
| PaymentSummaryCard | Exists | Shows customer payment history |
| VerifyPaymentDialog | Exists | Handles partial payment verification |
| Balance Request Edge Function | Exists | Sends email + notification to customer |

### Gaps to Close
| Issue | Impact | Priority |
|-------|--------|----------|
| Balance payment uploads don't auto-detect payment type | Customer confusion | High |
| Status transition errors are generic | Poor admin UX | High |
| Notifications lack explicit amounts | Customer confusion | Medium |
| RLS for payment_records needs audit | Security gap | Medium |
| Audit logs missing some payment events | Compliance gap | Low |

---

## Implementation Phases

### Phase A: Payment State Model Hardening

#### A1. Enforce Derived payment_status (No Manual Overrides)

Update `update_order_payment_status()` trigger to ALWAYS recalculate:

```sql
-- Ensure payment_status is NEVER manually set incorrectly
-- This runs on EVERY update to payment_amount_confirmed
CREATE OR REPLACE FUNCTION public.update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Always recalculate, never trust manual input
  IF NEW.payment_amount_confirmed IS NULL OR NEW.payment_amount_confirmed = 0 THEN
    NEW.payment_status := 'unpaid'::public.payment_status_enum;
  ELSIF NEW.payment_amount_confirmed < NEW.total_amount THEN
    NEW.payment_status := 'partially_paid'::public.payment_status_enum;
  ELSIF NEW.payment_amount_confirmed = NEW.total_amount THEN
    NEW.payment_status := 'fully_paid'::public.payment_status_enum;
  ELSE
    NEW.payment_status := 'overpaid'::public.payment_status_enum;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Files Modified**: Database migration only

#### A2. Auto-Detect Balance Payment on Upload

Update `CustomerPaymentProofDialog.tsx` to check if order already has a verified deposit:

```typescript
// Detect if this is a balance payment by checking existing payment_amount_confirmed
const isBalancePayment = (order.payment_amount_confirmed || 0) > 0;
const balanceRemaining = order.total_amount - (order.payment_amount_confirmed || 0);

// Pass payment type to backend
const updateData = {
  payment_proof_url: publicUrl,
  payment_reference: paymentReference,
  payment_method: paymentMethod,
  payment_proof_uploaded_at: new Date().toISOString(),
  // New: indicate this is a balance payment
  payment_proof_type: isBalancePayment ? 'balance' : 'deposit',
};
```

**Files Modified**: 
- `src/components/customer/CustomerPaymentProofDialog.tsx`
- `supabase/functions/notify-payment-proof-uploaded/index.ts`

#### A3. Auto-Reconcile on Full Payment

Update `VerifyPaymentDialog.tsx` to automatically:
1. Calculate if new payment completes the balance
2. Update `payment_status` via the existing trigger
3. Emit correct notification type

**Current Implementation**: Already handles this correctly. No changes needed.

---

### Phase B: Order State Machine Clarity

#### B1. Replace Generic Errors with Actionable Messages

Create a utility to parse database constraint errors:

```typescript
// src/utils/orderStatusErrors.ts
export const parseStatusTransitionError = (error: any): {
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
} => {
  const message = error?.message || '';
  
  if (message.includes('Cannot start processing without verified payment')) {
    return {
      title: 'Payment Required',
      description: 'This order needs a verified deposit before processing can begin.',
      action: 'verify-payment',
      actionLabel: 'Verify Payment',
    };
  }
  
  if (message.includes('Cannot ship until fully paid')) {
    const balanceMatch = message.match(/Balance: ([\d,.]+)/);
    const balance = balanceMatch ? balanceMatch[1] : 'outstanding';
    return {
      title: 'Balance Payment Required',
      description: `Cannot proceed to shipping. Outstanding balance: ${balance}`,
      action: 'request-balance',
      actionLabel: 'Request Balance Payment',
    };
  }
  
  if (message.includes('Cannot ship without delivery address')) {
    return {
      title: 'Address Required',
      description: 'Customer must provide a delivery address before shipping.',
      action: 'request-address',
      actionLabel: 'Request Address',
    };
  }
  
  // Default fallback
  return {
    title: 'Status Update Failed',
    description: message || 'Please check order requirements and try again.',
  };
};
```

**Files Modified**:
- `src/utils/orderStatusErrors.ts` (new file)
- `src/components/orders/UnifiedOrdersManagement.tsx`
- `src/components/orders/OrdersDataTable.tsx`

#### B2. Add "Why is this blocked?" Tooltips

Enhance status badges to explain blockers:

```typescript
// In OrderStatusBadge or inline where status is displayed
const getBlockerReason = (order: Order): string | null => {
  if (order.status === 'processing' && order.payment_status === 'partially_paid') {
    return `Waiting for balance payment of ${order.currency} ${order.balance_remaining?.toLocaleString()}`;
  }
  if (order.status === 'processing' && !order.delivery_address_id) {
    return 'Waiting for customer to provide delivery address';
  }
  if (order.status === 'payment_received' && order.payment_status !== 'fully_paid') {
    return 'Order cannot proceed until fully paid';
  }
  return null;
};
```

**Files Modified**:
- `src/components/customer/OrderStatusBadge.tsx`
- `src/components/orders/OrdersDataTable.tsx`

---

### Phase C: Notification Truthfulness

#### C1. Audit and Fix Notification Text

Update all payment-related notifications to include explicit amounts:

| Current | Fixed |
|---------|-------|
| "Payment received" | "Deposit of GHS 500 received - Balance of GHS 300 remaining" |
| "Payment verified" | "Balance payment verified - Order fully paid (GHS 800 total)" |
| "Order processing" | "Order processing - Awaiting balance payment of GHS 300" |

**Files Modified**:
- `src/components/orders/VerifyPaymentDialog.tsx` (notification text)
- `supabase/functions/send-payment-confirmation/index.ts` (email templates)
- `supabase/functions/send-balance-payment-request/index.ts` (email templates)
- `src/services/notificationService.ts` (in-app notifications)

#### C2. Customer Portal Notification Display

Ensure CustomerOrders displays payment status with amounts:

```typescript
// Already exists in CustomerOrders.tsx - just audit for clarity
{hasPartialPayment(order) && (
  <Alert variant="warning">
    <h4>Balance Payment Required</h4>
    <p>Amount Received: {order.currency} {order.payment_amount_confirmed}</p>
    <p className="font-bold">Balance: {order.currency} {order.balance_remaining}</p>
    <p>Please complete the remaining payment to proceed with shipping.</p>
  </Alert>
)}
```

**Files Modified**: Review only - already implemented correctly

---

### Phase D: Admin-Customer Parity

#### D1. Verify RLS for payment_records

Audit and fix RLS policies:

```sql
-- Customer can only see their own payment records
CREATE POLICY "customers_view_own_payment_records" ON public.payment_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customer_users cu ON o.customer_id = cu.customer_id
    WHERE o.id = payment_records.order_id
    AND cu.user_id = auth.uid()
  )
);

-- Customer cannot modify payment records
CREATE POLICY "customers_cannot_modify_payment_records" ON public.payment_records
FOR INSERT USING (false);

CREATE POLICY "customers_cannot_update_payment_records" ON public.payment_records
FOR UPDATE USING (false);
```

**Files Modified**: Database migration

#### D2. Ensure PaymentSummaryCard Shows Consistent Data

Already implemented correctly - no changes needed.

---

### Phase E: Audit Completeness

#### E1. Add Payment Event Logging

Create audit entries for all payment events:

```typescript
// Add to VerifyPaymentDialog after successful verification
await supabase.from('audit_logs').insert({
  user_id: user.id,
  event_type: 'payment_verified',
  action: isNowFullyPaid ? 'full_payment_verified' : 'deposit_verified',
  severity: 'info',
  event_data: {
    order_id: order.id,
    order_number: order.order_number,
    amount_verified: parsedAmount,
    total_paid: totalPaid,
    balance_remaining: balanceAfterPayment,
    payment_type: paymentType,
    previous_status: order.payment_status,
    new_status: isNowFullyPaid ? 'fully_paid' : 'partially_paid',
  }
});
```

**Files Modified**:
- `src/components/orders/VerifyPaymentDialog.tsx`
- `supabase/functions/send-balance-payment-request/index.ts`

---

### Phase F: Error Handling UX

#### F1. Defensive UI - Disable Buttons for Blocked Actions

Add visual guards to admin actions:

```typescript
// In OrdersDataTable.tsx
const ShipButton = ({ order, onClick }) => {
  const canShip = order.payment_status === 'fully_paid' || order.payment_status === 'overpaid';
  const hasAddress = !!order.delivery_address_id;
  
  if (!canShip || !hasAddress) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button disabled variant="outline" size="sm">
              <Truck className="h-4 w-4 mr-2" />
              Mark Ready to Ship
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {!canShip && <p>Requires full payment (Balance: {order.currency} {order.balance_remaining})</p>}
            {!hasAddress && <p>Requires delivery address</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Button onClick={onClick} size="sm">
      <Truck className="h-4 w-4 mr-2" />
      Mark Ready to Ship
    </Button>
  );
};
```

**Files Modified**:
- `src/components/orders/OrdersDataTable.tsx`
- `src/components/orders/UnifiedOrdersManagement.tsx`

#### F2. Surface Database Errors Gracefully

Wrap status update calls with error parser:

```typescript
try {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);
    
  if (error) {
    const parsed = parseStatusTransitionError(error);
    toast({
      title: parsed.title,
      description: parsed.description,
      variant: 'destructive',
      action: parsed.action && (
        <Button size="sm" onClick={() => handleAction(parsed.action, order)}>
          {parsed.actionLabel}
        </Button>
      ),
    });
    return;
  }
} catch (err) {
  // Handle unexpected errors
}
```

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/utils/orderStatusErrors.ts` | Parse database constraint errors into user-friendly messages |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/customer/CustomerPaymentProofDialog.tsx` | Auto-detect balance payment |
| `src/components/orders/VerifyPaymentDialog.tsx` | Add audit logging, improve notifications |
| `src/components/orders/OrdersDataTable.tsx` | Disable blocked actions, add blocker tooltips |
| `src/components/orders/UnifiedOrdersManagement.tsx` | Use error parser for status changes |
| `src/components/customer/OrderStatusBadge.tsx` | Add blocker explanations |
| Database migration | Harden payment_status trigger, verify RLS |

---

## Testing Checklist

### Money Flow Tests
- [ ] Partial payment visible to customer immediately after upload
- [ ] Partial payment visible to admin with correct amounts
- [ ] Balance request shows exact outstanding amount
- [ ] Balance payment auto-detects it's not a new deposit
- [ ] Order unblocks for shipping only when fully paid

### Regression Tests
- [ ] Admin can still process orders normally
- [ ] Customer cannot see other customers' payment data
- [ ] No RLS policies broken
- [ ] No role logic changed

### UX Tests
- [ ] No stuck order states without explanation
- [ ] All payment statuses show amounts
- [ ] Notifications are accurate and specific
- [ ] Blocked actions show why they're blocked

---

## What This Plan Does NOT Do

- Does not add new product features
- Does not change role permissions
- Does not modify pricing or subscriptions
- Does not redesign dashboards
- Does not add new order statuses
- Does not change the fundamental payment flow

This is purely **stabilization and correctness work**.
