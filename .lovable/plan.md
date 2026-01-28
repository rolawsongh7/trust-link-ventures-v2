
# Plan: Fix Balance Payment Notification Delivery to Customer Portal

## Problem Summary

The balance payment notification created by the `send-balance-payment-request` edge function is **not visible to customers** because:

1. **Wrong Table**: The function inserts into `notifications` table instead of `user_notifications`
2. **Missing Fields**: The notification is missing critical fields like `link`, `requires_action`, and action event tracking fields

**Evidence**:
- Notification exists in `notifications` table with ID `76a36219-2a1b-426d-9d0a-b129e0111bc1`
- No corresponding entry in `user_notifications` table
- Customer portal's `useCustomerNotifications` hook only queries `user_notifications`

---

## Current State Analysis

### Database Tables

| Table | Purpose | Used By |
|-------|---------|---------|
| `notifications` | Legacy/unused table | Nothing reads from this |
| `user_notifications` | Primary notification system | Customer portal, Admin portal |

### CustomerOrders Balance Display - Already Working

The UI already correctly displays partial payment balance:
- Lines 60-70: `hasPartialPayment()` and `getBalanceRemaining()` helpers
- Lines 786-818: Amber "Balance Payment Required" alert with payment summary
- Lines 804-814: "Upload Balance Payment" CTA button
- Lines 149-192: Auto-open payment dialog via `uploadPayment` query parameter

---

## Solution

### File to Modify

`supabase/functions/send-balance-payment-request/index.ts`

### Changes Required

**Lines 158-176**: Change the notification insert from `notifications` to `user_notifications` with proper fields:

```typescript
// Current (broken):
const { error: notifError } = await supabase
  .from("notifications")
  .insert({
    user_id: order.customers.id,
    type: "balance_payment_request",
    title: "Balance Payment Required",
    message: `Please complete the balance payment...`,
    data: { ... }
  });

// Fixed:
const { error: notifError } = await supabase
  .from("user_notifications")
  .insert({
    user_id: order.customers.id,
    type: "balance_payment_request",
    title: "Balance Payment Required",
    message: `Please complete the balance payment of ${currency} ${balanceRemaining.toLocaleString()} for Order #${orderNumber}`,
    link: `/portal/orders?uploadPayment=${orderId}`,
    requires_action: true,
    entity_type: "order",
    entity_id: orderId,
    metadata: {
      order_id: orderId,
      order_number: orderNumber,
      balance_remaining: balanceRemaining,
      currency: currency
    }
  });
```

### Key Changes

1. **Table**: `notifications` -> `user_notifications`
2. **Add `link`**: `/portal/orders?uploadPayment={orderId}` - enables click-to-navigate
3. **Add `requires_action: true`**: Marks as actionable event
4. **Add `entity_type`/`entity_id`**: Links to order for resolution tracking
5. **Rename `data`** -> `metadata`: Match `user_notifications` column name

---

## Additional Enhancement: Update CustomerNotifications Icon

### File to Modify

`src/pages/CustomerNotifications.tsx`

### Change Required

Add icon mapping for `balance_payment_request` notification type in `getNotificationIcon()`:

```typescript
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'warning':
    case 'balance_payment_request':  // Add this case
      return <AlertCircle className="h-5 w-5 text-[#F4B400]" />;
    default:
      return <Info className="h-5 w-5 text-[#0077B6]" />;
  }
};
```

Also update `getNotificationStyle()` for consistent amber styling.

---

## Testing Plan

After implementation:

1. **Admin**: Click "Request Balance Payment" for order ORD-202511-8528
2. **Verify**: Check `user_notifications` table has new entry
3. **Customer Portal**: Navigate to `/portal/notifications` as customer
4. **Verify**: Notification appears with amber styling
5. **Click**: Notification navigates to `/portal/orders?uploadPayment=...`
6. **Verify**: Payment proof dialog auto-opens
7. **Upload**: Customer uploads balance payment proof

---

## Files to Modify

1. `supabase/functions/send-balance-payment-request/index.ts` - Fix table name and add fields
2. `src/pages/CustomerNotifications.tsx` - Add icon/style for balance_payment_request type

---

## Non-Breaking Changes

- No database migrations required
- Existing notifications in `notifications` table remain (can be cleaned up later)
- Order display logic unchanged
- Payment upload flow unchanged
