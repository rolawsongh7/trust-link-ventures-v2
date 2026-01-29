
# Fix "Failed to Update Order Status" for Partial Payments

## Problem Diagnosis

### Root Cause Identified

The database trigger `validate_order_status_transition` blocks the status update. The current transition rules are:

```sql
"pending_payment": ["payment_received", "cancelled"]
```

When an admin clicks **"Move to Processing (Partial)"**, the system attempts:
- `pending_payment` → `processing`

**This transition is blocked** because `processing` is not in the allowed list for `pending_payment`.

### Current Order State (from DB query)

```
ORD-202601-4928: status=pending_payment, payment_status=partially_paid
ORD-202511-8528: status=pending_payment, payment_status=partially_paid
```

These orders are stuck because they cannot transition to `processing` even though they have verified partial payments.

---

## Solution Architecture

### Domain Model (Already Exists)

The database already has the correct `payment_status_enum`:
- `unpaid`
- `partially_paid`
- `fully_paid`
- `overpaid`

### Required Status Transition Rules

| Order Status      | Allowed Next Statuses                         | Condition                          |
|-------------------|-----------------------------------------------|-----------------------------------|
| `pending_payment` | `payment_received`, `processing`, `cancelled` | `processing` only if `partially_paid` or `fully_paid` |
| `payment_received`| `processing`, `cancelled`                     | Standard flow                     |
| `processing`      | `ready_to_ship`, `cancelled`                  | Standard flow                     |
| `ready_to_ship`   | `shipped`, `cancelled`                        | Only if `fully_paid`              |
| `shipped`         | `delivered`, `delivery_failed`                | Only if `fully_paid`              |

---

## Implementation Plan

### Phase 1: Update Status Transition Trigger

**File: SQL Migration**

Update the `validate_order_status_transition` function to:

1. Add `processing` as valid transition from `pending_payment`
2. Add payment status check for partial payment flow
3. Add strict payment guard for shipping statuses

**New transition rules:**
```sql
{
  "pending_payment": ["payment_received", "processing", "cancelled"],
  "payment_received": ["processing", "cancelled"],
  "processing": ["ready_to_ship", "cancelled"],
  "ready_to_ship": ["shipped", "cancelled"],
  "shipped": ["delivered", "delivery_failed"],
  "delivered": [],
  "cancelled": [],
  "delivery_failed": ["shipped"]
}
```

**Additional validation logic:**
```sql
-- Allow pending_payment → processing ONLY if payment_status is partially_paid or fully_paid
IF OLD.status = 'pending_payment' AND NEW.status = 'processing' THEN
  IF NEW.payment_status NOT IN ('partially_paid', 'fully_paid', 'overpaid') THEN
    RAISE EXCEPTION 'Cannot start processing without at least a deposit payment. Current payment status: %', NEW.payment_status;
  END IF;
END IF;

-- Shipping guard: Block ready_to_ship and shipped unless fully_paid
IF NEW.status IN ('ready_to_ship', 'shipped') THEN
  IF NEW.payment_status NOT IN ('fully_paid', 'overpaid') THEN
    RAISE EXCEPTION 'Cannot ship order until fully paid. Current payment status: %. Balance remaining: %', 
      NEW.payment_status, NEW.balance_remaining;
  END IF;
END IF;
```

---

### Phase 2: Add Shipping Guard to Existing Trigger

**File: SQL Migration**

The `validate_delivery_address_before_shipping` trigger already exists. We need to ensure payment checks are in place.

Add to the `validate_order_status_transition` function:
```sql
-- Enforce full payment before shipping
IF NEW.status IN ('ready_to_ship', 'shipped') 
   AND (OLD.status IS NULL OR OLD.status NOT IN ('ready_to_ship', 'shipped')) THEN
  IF NEW.payment_status IS NULL OR NEW.payment_status NOT IN ('fully_paid', 'overpaid') THEN
    RAISE EXCEPTION 'Cannot mark order as % without full payment. Balance remaining: %', 
      NEW.status, 
      COALESCE(NEW.balance_remaining, NEW.total_amount);
  END IF;
END IF;
```

---

### Phase 3: Update Frontend Handler

**File: `src/components/orders/UnifiedOrdersManagement.tsx`**

The current handler is correct but needs better error handling:

```typescript
const handleMoveToProcessingPartial = async (order: Order) => {
  try {
    const confirmedAmount = (order as any).payment_amount_confirmed || 0;
    const balance = order.total_amount - confirmedAmount;
    
    // Validation: ensure there's actually a partial payment
    if (confirmedAmount <= 0) {
      toast.error('Cannot process without verified payment', {
        description: 'Please verify at least a deposit payment first.'
      });
      return;
    }
    
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        notes: `${order.notes || ''}\n[PARTIAL PAYMENT]: Processing started with deposit. Balance: ${order.currency} ${balance.toLocaleString()} pending.`.trim()
      })
      .eq('id', order.id);

    if (error) {
      console.error('Failed to update order status:', error);
      if (error.message.includes('payment')) {
        toast.error('Payment verification required', {
          description: 'A deposit must be verified before processing can begin.'
        });
      } else if (error.message.includes('transition')) {
        toast.error('Invalid status transition', {
          description: error.message
        });
      } else {
        throw error;
      }
      return;
    }

    toast.success('Order moved to processing', {
      description: `Balance of ${order.currency} ${balance.toLocaleString()} will be collected before shipping.`
    });
    refetch();
  } catch (error) {
    console.error('Error moving order to processing:', error);
    toast.error('Failed to update order status');
  }
};
```

---

### Phase 4: Add Shipping Guard to UI

**File: `src/components/orders/OrdersDataTable.tsx`**

Update the "Ready to Ship" action to show tooltip when payment is incomplete:

```typescript
{row.status === 'processing' && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenuItem 
          onClick={() => {
            if (row.payment_status === 'fully_paid' || row.payment_status === 'overpaid') {
              onQuickStatusChange(row, 'ready_to_ship');
            }
          }}
          disabled={row.payment_status !== 'fully_paid' && row.payment_status !== 'overpaid'}
          className={row.payment_status !== 'fully_paid' && row.payment_status !== 'overpaid' ? 'opacity-50 cursor-not-allowed' : ''}
        >
          <Package className="mr-2 h-4 w-4" />
          Mark Ready to Ship
          {row.payment_status !== 'fully_paid' && row.payment_status !== 'overpaid' && (
            <Lock className="ml-auto h-3 w-3 text-amber-500" />
          )}
        </DropdownMenuItem>
      </TooltipTrigger>
      {row.payment_status !== 'fully_paid' && row.payment_status !== 'overpaid' && (
        <TooltipContent>
          <p>Full payment required before shipping.</p>
          <p className="text-xs text-muted-foreground">Balance: {row.currency} {row.balance_remaining?.toLocaleString()}</p>
        </TooltipContent>
      )}
    </Tooltip>
  </TooltipProvider>
)}
```

---

## SQL Migration Script

Create migration file: `supabase/migrations/20260129_fix_partial_payment_transitions.sql`

```sql
-- Fix order status transitions to support partial payment workflow
-- This allows orders with partial payments to move to processing
-- while blocking shipping until fully paid

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "order_confirmed": ["pending_payment", "cancelled"],
    "pending_payment": ["payment_received", "processing", "cancelled"],
    "payment_received": ["processing", "cancelled"],
    "processing": ["ready_to_ship", "cancelled"],
    "ready_to_ship": ["shipped", "cancelled"],
    "shipped": ["delivered", "delivery_failed"],
    "delivered": [],
    "cancelled": [],
    "delivery_failed": ["shipped"]
  }'::jsonb;
  allowed_next_statuses text[];
BEGIN
  -- Initial status validation
  IF OLD.status IS NULL THEN
    IF NEW.status NOT IN ('order_confirmed', 'pending_payment', 'payment_received') THEN
      RAISE EXCEPTION 'Invalid initial order status: %. Must be one of: order_confirmed, pending_payment, payment_received', NEW.status
        USING HINT = 'New orders should start with order_confirmed, pending_payment, or payment_received';
    END IF;
    RETURN NEW;
  END IF;
  
  -- No change = no validation needed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get allowed transitions
  allowed_next_statuses := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions->OLD.status::text)
  );

  -- Check if transition is valid
  IF NOT (NEW.status::text = ANY(allowed_next_statuses)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next_statuses, ', ')
      USING HINT = format('Contact support if you need to force a status change.');
  END IF;
  
  -- PARTIAL PAYMENT GUARD: pending_payment → processing requires at least deposit
  IF OLD.status = 'pending_payment' AND NEW.status = 'processing' THEN
    IF NEW.payment_status IS NULL OR NEW.payment_status::text = 'unpaid' THEN
      RAISE EXCEPTION 'Cannot start processing without verified payment. Verify at least a deposit first.'
        USING HINT = 'Use "Verify Payment" to confirm the deposit before processing.';
    END IF;
  END IF;
  
  -- SHIPPING GUARD: Block shipping without full payment
  IF NEW.status IN ('ready_to_ship', 'shipped') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ready_to_ship', 'shipped')) THEN
    
    -- Check payment status
    IF NEW.payment_status IS NULL OR NEW.payment_status::text NOT IN ('fully_paid', 'overpaid') THEN
      RAISE EXCEPTION 'Cannot ship until fully paid. Current: %, Balance: %', 
        COALESCE(NEW.payment_status::text, 'unpaid'),
        COALESCE(NEW.balance_remaining, NEW.total_amount)
        USING HINT = 'Collect the remaining balance before marking as ready to ship.';
    END IF;
    
    -- Check delivery address
    IF NEW.delivery_address_id IS NULL THEN
      RAISE EXCEPTION 'Cannot ship without delivery address. Request address first.'
        USING HINT = 'Use "Request Delivery Address" to get the customer address.';
    END IF;
  END IF;
  
  -- SHIPPED validation: carrier and tracking required
  IF NEW.status = 'shipped' THEN
    IF NEW.carrier IS NULL OR trim(NEW.carrier) = '' THEN
      RAISE EXCEPTION 'Cannot ship without carrier information.'
        USING HINT = 'Set carrier (e.g., DHL, FedEx) before marking as shipped.';
    END IF;
    
    IF NEW.tracking_number IS NULL OR trim(NEW.tracking_number) = '' THEN
      RAISE EXCEPTION 'Cannot ship without tracking number.'
        USING HINT = 'Set tracking number before marking as shipped.';
    END IF;
    
    IF NEW.estimated_delivery_date IS NULL THEN
      RAISE EXCEPTION 'Cannot ship without estimated delivery date.'
        USING HINT = 'Set estimated delivery date before marking as shipped.';
    END IF;
  END IF;

  -- Log the transition
  PERFORM log_security_event(
    'order_status_transition',
    auth.uid(),
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'payment_status', NEW.payment_status,
      'transition_valid', true
    ),
    NULL,
    NULL,
    'low'
  );
  
  RETURN NEW;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_order_status_transition() IS 
'Validates order status transitions with payment-aware guards:
- pending_payment → processing: requires at least partial payment
- ready_to_ship/shipped: requires full payment and delivery address
- shipped: requires carrier, tracking, and estimated delivery';
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/migrations/20260129_fix_partial_payment_transitions.sql` | Create | New migration with updated trigger function |
| `src/components/orders/UnifiedOrdersManagement.tsx` | Modify | Improve error handling in `handleMoveToProcessingPartial` |
| `src/components/orders/OrdersDataTable.tsx` | Modify | Add shipping guard tooltip when payment incomplete |

---

## Testing Checklist

After implementation, verify:

1. **Partial Payment Flow**
   - [ ] Verify deposit on order → order stays at `pending_payment`, `payment_status = partially_paid`
   - [ ] Click "Move to Processing (Partial)" → order moves to `processing` ✅
   - [ ] Toast shows "Balance of X pending"

2. **Shipping Block**
   - [ ] Order at `processing` with `partially_paid` → "Ready to Ship" is disabled
   - [ ] Tooltip shows "Full payment required"
   - [ ] Verify balance payment → `payment_status = fully_paid`
   - [ ] "Ready to Ship" becomes enabled ✅

3. **Full Payment Flow**
   - [ ] Verify full payment → order moves to `payment_received` then `processing`
   - [ ] "Ready to Ship" is immediately available ✅

4. **Error Messages**
   - [ ] Attempt to ship without payment → clear error message
   - [ ] Attempt to process without deposit → clear error message

---

## Non-Goals

- No changes to payment verification dialog (already correct)
- No changes to payment_status enum (already exists)
- No bypassing RLS policies
- No client-side workarounds
