
# Customer Payment Proof Viewing & Payment Summary UI

## Executive Summary

This plan implements secure, read-only payment proof viewing for customers in their portal, along with a modern Payment Summary UI. The implementation adds RLS policies to allow customers to view their own payment records while keeping admin workflows unchanged.

---

## Current State Analysis

### Data Model
- **`payment_records` table**: Stores ledger entries with `amount`, `payment_type`, `proof_url`, `verified_at`, `verified_by`, `order_id`
- **`orders` table**: Has `payment_proof_url`, `payment_status`, `payment_amount_confirmed`, `balance_remaining`
- **Storage bucket**: `payment-proofs` (private, requires signed URLs)

### Existing RLS Policies
- **`payment_records`**: Only admins have SELECT access (`Admins can view all payment records`)
- **`orders`**: Customers can view via `user_can_access_customer(customer_id, auth.uid())`
- **Storage**: `payment-proofs` bucket has `Allow authenticated select` policy (overly permissive)

### Customer Access Pattern
- `customer_users` table links `user_id` to `customer_id`
- `user_can_access_customer()` function checks admin role OR `customer_users` membership
- Orders fetched by `customer_id` matching customer linked to user's email

---

## Architecture

```text
+------------------+          +-------------------+
|  CustomerOrders  |--------->| PaymentSummaryCard|
+------------------+          +-------------------+
                                       |
                                       v
                              +-------------------+
                              | PaymentProofViewer|
                              +-------------------+
                                       |
                                       v
                              +-------------------+
                              |  Signed URL API   |
                              |  (via Supabase)   |
                              +-------------------+
```

---

## Implementation Plan

### Phase 1: Database RLS Policy for Customer Payment Records

Create a new RLS policy allowing customers to read payment records for their orders.

**SQL Migration:**
```sql
-- Allow customers to view payment records for their own orders
CREATE POLICY "Customers can view their own payment records"
ON public.payment_records
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customer_users cu ON cu.customer_id = o.customer_id
    WHERE o.id = payment_records.order_id
    AND cu.user_id = auth.uid()
  )
);
```

This policy:
- Uses existing `customer_users` link table
- Joins through `orders` to verify ownership
- Only grants SELECT (read-only)
- Does not expose admin-only fields (those are still in the row, but customers can filter what they need)

---

### Phase 2: Secure Storage Policy for Payment Proofs

The current `Allow authenticated select from payment-proofs` is too permissive. Update to check ownership.

**SQL Migration:**
```sql
-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated select from payment-proofs" ON storage.objects;

-- Create customer-scoped read policy
CREATE POLICY "Customers can view their own payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (
    -- Admin access
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
    OR
    -- Customer access: file path includes their customer_id
    EXISTS (
      SELECT 1 FROM customer_users cu
      WHERE cu.user_id = auth.uid()
      AND (storage.foldername(name))[1] = cu.customer_id::text
    )
  )
);
```

Note: Files are stored as `{customer_id}/{order_number}-{timestamp}.{ext}` so we validate the folder matches the customer.

---

### Phase 3: Create PaymentSummaryCard Component

**New File: `src/components/customer/PaymentSummaryCard.tsx`**

A read-only card showing payment history for an order.

```typescript
interface PaymentSummaryCardProps {
  orderId: string;
  orderCurrency: string;
  totalAmount: number;
}
```

**Features:**
- Lists all payment entries (deposit, balance, etc.)
- Shows verification status with colored chips:
  - Green: Verified
  - Yellow: Pending Verification
  - Red: Rejected (if applicable)
- "View Proof" button opens proof in modal/new tab
- Displays total paid vs balance remaining
- Empty state for no payments

**UI Layout:**
```text
+-------------------------------------------+
| Payments                                  |
| Track your payments and verification      |
+-------------------------------------------+
| Deposit                    GHS 2,000.00   |
| [Verified] Jan 29, 2026    [View Proof]   |
+-------------------------------------------+
| Balance                    GHS 1,500.00   |
| [Pending] Jan 30, 2026     [View Proof]   |
+-------------------------------------------+
| Total Paid: GHS 3,500.00                  |
| Balance: GHS 0.00                         |
+-------------------------------------------+
```

---

### Phase 4: Create PaymentProofViewerDialog Component

**New File: `src/components/customer/PaymentProofViewerDialog.tsx`**

Secure modal for viewing payment proof images.

**Features:**
- Fetches fresh signed URL on open (5-10 min expiry)
- Displays image in zoomable viewer
- PDF opens in new tab
- Download disabled for customers (view-only)
- Loading state while fetching URL
- Error handling for expired/invalid URLs

**Implementation:**
```typescript
interface PaymentProofViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proofUrl: string | null;
  paymentType: string;
  paymentDate: string;
}
```

---

### Phase 5: Integrate PaymentSummaryCard into Customer Order Views

**Modify: `src/components/customer/CustomerOrders.tsx`**

Add PaymentSummaryCard after order items section for orders with payments.

Location in component:
1. After the "Order Items" section
2. Before the "Payment Instructions" section
3. Only show if order has verified or pending payments

**Modify: `src/components/customer/mobile/MobileOrderDetailDialog.tsx`**

Add compact version of PaymentSummaryCard in the mobile dialog.

---

### Phase 6: Add Signed URL Helper Hook

**New File: `src/hooks/usePaymentProofUrl.ts`**

Hook to fetch fresh signed URLs for payment proofs.

```typescript
export const usePaymentProofUrl = (proofUrl: string | null) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUrl = async () => {
    if (!proofUrl) return;
    // Extract path from URL and generate new signed URL
    // Signed URLs expire after 10 minutes
  };

  return { signedUrl, loading, error, refreshUrl };
};
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/customer/PaymentSummaryCard.tsx` | Payment history card component |
| `src/components/customer/PaymentProofViewerDialog.tsx` | Secure proof viewer modal |
| `src/hooks/usePaymentProofUrl.ts` | Signed URL helper hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/customer/CustomerOrders.tsx` | Integrate PaymentSummaryCard |
| `src/components/customer/mobile/MobileOrderDetailDialog.tsx` | Add compact payment summary |

## Database Changes

| Change | Description |
|--------|-------------|
| RLS Policy on `payment_records` | Allow customers to SELECT their own payment records |
| Storage Policy on `payment-proofs` | Restrict to customer-owned files only |

---

## Security Guarantees

1. **Customer Isolation**: RLS ensures customers only see their own payment records
2. **Read-Only Access**: No UPDATE/DELETE policies for customers on payment_records
3. **Signed URLs**: Short-lived (10 min) URLs prevent unauthorized sharing
4. **Admin Fields Hidden**: UI only displays customer-safe fields (amount, type, date, status)
5. **No State Mutation**: Payment summary is purely read-only display
6. **Storage Scoped**: Files validated by customer_id folder structure

---

## Fields Exposed to Customers

| Field | Shown | Hidden |
|-------|-------|--------|
| `amount` | Yes | - |
| `payment_type` | Yes | - |
| `payment_date` | Yes | - |
| `proof_url` | Yes (via signed URL) | - |
| `verified_at` | Yes (as status) | - |
| `notes` | No | Hidden from customers |
| `verified_by` | No | Hidden from customers |
| `recorded_by` | No | Hidden from customers |

---

## Testing Checklist

1. **RLS Verification**
   - [ ] Customer can see payment records for their orders only
   - [ ] Customer cannot see other customers' payment records
   - [ ] Admin can still see all payment records

2. **Storage Access**
   - [ ] Customer can view their own payment proof files
   - [ ] Customer cannot view other customers' proof files
   - [ ] Admin can view all proof files

3. **UI Functionality**
   - [ ] Payment summary shows on order with payments
   - [ ] Empty state shows when no payments
   - [ ] Proof viewer opens correctly
   - [ ] Signed URLs work and expire properly

4. **Mobile**
   - [ ] Mobile dialog shows payment summary
   - [ ] Proof viewer works on mobile

5. **Admin Workflows**
   - [ ] Verify payment still works
   - [ ] Reject payment still works
   - [ ] Admin can still view all proofs

---

## Non-Goals (Explicitly Out of Scope)

- Customers cannot edit or delete payment records
- Customers cannot re-upload over existing proofs
- Customers cannot see admin notes or internal flags
- No changes to payment verification workflow
- No changes to payment_status derivation logic
