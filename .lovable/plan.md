
# Plan: Fix Order Progression After Partial Payment Verification

## Problem Summary

When an admin verifies a partial payment, the order gets "stuck" with no available actions because:

1. Status is set to `pending_payment` (not `payment_received`)
2. "Start Processing" action only appears for `payment_received` status
3. "Verify Payment Proof" action disappears once `payment_verified_at` is set
4. No dedicated actions exist for partial payment orders

**Current Database State (verified):**
- Order `ORD-202511-8528`: status=`pending_payment`, payment_verified_at=SET, payment_amount_confirmed=1500, total_amount=1841

---

## Root Cause Analysis

| Component | Current Logic | Problem |
|-----------|--------------|---------|
| `OrdersDataTable.tsx` Line 590-595 | Show "Verify Payment" only if `!payment_verified_at` | Verified partial payments have no verify action |
| `OrdersDataTable.tsx` Line 607-633 | Show "Start Processing" only for `status === 'payment_received'` | Partial payments have status `pending_payment` |
| `getPaymentIndicator()` Line 204-220 | Shows "Verified" if `payment_verified_at` exists | No distinction for partial vs full verification |
| `VerifyPaymentDialog.tsx` Line 149 | Sets status to `pending_payment` for partial | Correct, but no subsequent actions available |

---

## Solution Overview

### 1. Extend Order Interface
Add fields to track partial payment state:
- `payment_amount_confirmed`: Already exists in DB
- `payment_status_reason`: Already exists in DB
- Create helper function to detect partial payment

### 2. Update Payment Indicator
Show "Partial" badge with balance remaining for verified partial payments.

### 3. Add New Admin Actions
For orders with verified partial payments (`status='pending_payment' && payment_verified_at && payment_amount_confirmed < total_amount`):
- **Request Balance Payment** - Send email to customer requesting remaining balance
- **Move to Processing (Partial)** - Allow order to proceed with partial payment acknowledgment

### 4. Update Status Transition Guards
- Allow `pending_payment` -> `processing` for verified partial payments
- Block `processing` -> `shipped` unless fully paid
- Block `ready_to_ship` -> `shipped` for partial payments

### 5. Enhance Customer Notifications
- Update `send-payment-confirmation` to include balance remaining for partial payments
- Add customer-facing "Balance Remaining" display in portal

---

## Implementation Details

### File: `src/components/orders/OrdersDataTable.tsx`

**Change 1: Extend Order interface (lines 54-88)**
Add missing payment fields:
```typescript
interface Order {
  // ... existing fields ...
  payment_amount_confirmed?: number;
  payment_status_reason?: string;
}
```

**Change 2: Add helper function (after line 252)**
```typescript
// Check if order has verified partial payment
const hasVerifiedPartialPayment = (order: Order): boolean => {
  if (!order.payment_verified_at) return false;
  const confirmedAmount = (order as any).payment_amount_confirmed || 0;
  return confirmedAmount > 0 && confirmedAmount < order.total_amount;
};

// Get remaining balance
const getRemainingBalance = (order: Order): number => {
  const confirmedAmount = (order as any).payment_amount_confirmed || 0;
  return order.total_amount - confirmedAmount;
};
```

**Change 3: Update getPaymentIndicator (lines 204-220)**
Add partial payment state before "Verified" check:
```typescript
// Check for verified PARTIAL payment
if (order.payment_verified_at && (order as any).payment_status_reason?.includes('Partial')) {
  const confirmed = (order as any).payment_amount_confirmed || 0;
  const balance = order.total_amount - confirmed;
  return (
    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
      <DollarSign className="h-3 w-3" />
      Partial ({order.currency} {balance.toLocaleString()} due)
    </Badge>
  );
}
```

**Change 4: Update Actions Menu (lines 588-675)**
Add actions for partial payment orders:

```typescript
{/* Partial Payment Actions */}
{hasVerifiedPartialPayment(row) && row.status === 'pending_payment' && (
  <>
    <DropdownMenuItem onClick={() => onRequestBalancePayment(row)}>
      <DollarSign className="mr-2 h-4 w-4" />
      Request Balance Payment
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => onMoveToProcessingPartial(row)}>
      <Package className="mr-2 h-4 w-4" />
      Move to Processing (Partial)
    </DropdownMenuItem>
  </>
)}
```

**Change 5: Block shipping for partial payments**
Add guard in "Mark Ready to Ship" action (line 635-640):
```typescript
{row.status === 'processing' && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuItem 
          onClick={() => !hasVerifiedPartialPayment(row) && onQuickStatusChange(row, 'ready_to_ship')}
          disabled={hasVerifiedPartialPayment(row)}
          className={hasVerifiedPartialPayment(row) ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Package className="mr-2 h-4 w-4" />
          Mark Ready to Ship
          {hasVerifiedPartialPayment(row) && <Lock className="ml-auto h-3 w-3" />}
        </DropdownMenuItem>
      </TooltipTrigger>
      {hasVerifiedPartialPayment(row) && (
        <TooltipContent>Full payment required before shipping</TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
)}
```

---

### File: `src/components/orders/UnifiedOrdersManagement.tsx`

**Add new handler functions:**
```typescript
const handleRequestBalancePayment = async (order: Order) => {
  // Invoke edge function to send balance payment request email
  await supabase.functions.invoke('send-balance-payment-request', {
    body: { orderId: order.id }
  });
  toast({ title: 'Balance payment request sent' });
};

const handleMoveToProcessingPartial = async (order: Order) => {
  await supabase.from('orders').update({
    status: 'processing',
    processing_started_at: new Date().toISOString(),
    notes: `${order.notes || ''}\n[PARTIAL PAYMENT]: Processing started with partial payment. Balance pending.`
  }).eq('id', order.id);
  toast({ title: 'Order moved to processing' });
  refetch();
};
```

**Pass handlers to OrdersDataTable:**
```typescript
<OrdersDataTable
  // ... existing props ...
  onRequestBalancePayment={handleRequestBalancePayment}
  onMoveToProcessingPartial={handleMoveToProcessingPartial}
/>
```

---

### New Edge Function: `supabase/functions/send-balance-payment-request/index.ts`

Create new function to send balance payment request email:
- Fetch order details with customer info
- Calculate remaining balance
- Send email with payment instructions and portal link
- Create customer notification

---

### File: `supabase/functions/send-payment-confirmation/index.ts`

**Update to handle partial payments:**
- Add `isPartialPayment` and `balanceRemaining` parameters
- Update email template to show balance when partial:

```typescript
${isPartialPayment ? `
<div class="info-box" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
  <h3>Partial Payment Received</h3>
  <p><strong>Amount Received:</strong> ${currency} ${amountReceived}</p>
  <p><strong>Balance Remaining:</strong> ${currency} ${balanceRemaining}</p>
  <p>Please complete your payment to proceed with shipping.</p>
  <a href="https://trustlinkcompany.com/portal/orders">Upload Balance Payment</a>
</div>
` : ''}
```

---

### File: `src/components/customer/CustomerOrders.tsx`

**Add balance display for customers:**
Show remaining balance on orders with partial payment status.

---

## Status Transition Matrix

| Current Status | Payment State | Available Actions |
|---------------|---------------|-------------------|
| `pending_payment` | Unverified | Verify Payment Proof |
| `pending_payment` | Partial Verified | Request Balance, Move to Processing |
| `payment_received` | Full Verified | Start Processing |
| `processing` | Partial | Block "Ready to Ship" |
| `processing` | Full | Mark Ready to Ship |
| `ready_to_ship` | Partial | Block "Mark as Shipped" |
| `ready_to_ship` | Full | Mark as Shipped |

---

## Files to Modify

1. `src/components/orders/OrdersDataTable.tsx` - Add partial payment helpers, update indicator, add actions
2. `src/components/orders/UnifiedOrdersManagement.tsx` - Add handler functions
3. `src/components/orders/OrdersDataTable.tsx` props interface - Add new handler props
4. `supabase/functions/send-payment-confirmation/index.ts` - Update for partial payment emails
5. `src/components/customer/CustomerOrders.tsx` - Show balance remaining to customers

## New Files to Create

1. `supabase/functions/send-balance-payment-request/index.ts` - New edge function for balance requests

---

## Testing Scenarios

1. Verify partial payment -> order shows "Partial" badge with balance
2. Admin sees "Request Balance Payment" and "Move to Processing" actions
3. Admin can move partial payment order to processing
4. Admin CANNOT mark partial payment order as ready to ship
5. Customer receives email with balance remaining
6. Customer sees balance in portal
7. After full payment, normal flow resumes
8. Shipping is unlocked after full payment verification

---

## Non-Breaking Changes

- Existing orders unaffected
- Invoice calculations unchanged
- POD enforcement unchanged
- Audit logs preserved
- No database migrations required (fields already exist)
