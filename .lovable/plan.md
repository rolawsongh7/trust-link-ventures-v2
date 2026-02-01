
# Phase 5.2 Implementation Plan: Credit Terms & Deferred Payment

## Overview

This phase extends the existing **Phase 3B credit infrastructure** to enable **order-level credit usage** while integrating with **Phase 5.1 trust profiles**. The goal is to allow trusted customers to place orders on credit (Net 7/14/30) without bypassing payment workflows, reconciliation, or audit trails.

---

## Current State Analysis

### Existing Infrastructure from Phase 3B
The codebase already has substantial credit infrastructure:

| Component | Status | Location |
|-----------|--------|----------|
| `customer_credit_terms` table | Exists | Migration `20260131213833` |
| Credit limit, balance, net_terms, status | Exists | DB schema |
| `check_credit_eligibility` RPC | Exists | Checks loyalty tier (Silver+), orders, overdue invoices |
| `approve_credit_terms` RPC | Exists | Super admin only |
| `suspend_credit_terms` RPC | Exists | Super admin only |
| `adjust_credit_limit` RPC | Exists | Super admin only |
| `CreditTermsPanel` component | Exists | Admin UI for managing credit |
| `useCustomerCreditTerms` hook | Exists | Data fetching + mutations |
| `creditHelpers.ts` utilities | Exists | Formatting, utilization, colors |

### Phase 5.1 Trust Tier Integration Point
From Phase 5.1, we now have:
- `customer_trust_profiles` table with tiers: `new`, `verified`, `trusted`, `preferred`, `restricted`
- `isTierEligible(tier, 'credit')` helper returns `true` only for `preferred` tier

### Gap Analysis: What's Missing for Phase 5.2

| Gap | Description |
|-----|-------------|
| Order-level credit fields | No `credit_terms_days`, `credit_due_date`, `credit_amount_used` on orders |
| `apply_credit_to_order` RPC | No atomic function to apply credit to an order |
| Credit eligibility + trust check | Current eligibility uses loyalty tier, not trust tier |
| Customer portal credit option | No UI for customers to select "Pay on Credit" |
| Credit ledger view | No read-only view of credit usage history |
| Overdue balance blocking | No logic to block new credit if past-due exists |

---

## Implementation Plan

### 1. Database Schema Enhancements

#### 1.1 Extend Orders Table (Additive Only)

Add credit-related fields to the `orders` table:

```sql
ALTER TABLE public.orders
ADD COLUMN credit_terms_days INTEGER DEFAULT NULL,
ADD COLUMN credit_due_date DATE DEFAULT NULL,
ADD COLUMN credit_amount_used NUMERIC(15,2) DEFAULT NULL;
```

Fields:
- `credit_terms_days`: 7, 14, or 30 (from customer's net terms)
- `credit_due_date`: Calculated date when payment is due
- `credit_amount_used`: Amount charged against credit (may equal `total_amount`)

These fields are **additive** and do not replace existing payment fields.

#### 1.2 Create Credit Ledger View (Read-Only)

```sql
CREATE VIEW public.customer_credit_ledger AS
SELECT 
  o.id AS order_id,
  o.order_number,
  o.customer_id,
  o.total_amount,
  o.credit_amount_used,
  o.credit_due_date,
  o.payment_status,
  o.created_at AS order_date,
  CASE 
    WHEN o.credit_due_date < CURRENT_DATE 
         AND o.payment_status NOT IN ('fully_paid', 'overpaid') 
    THEN true 
    ELSE false 
  END AS is_overdue,
  cct.credit_limit,
  cct.current_balance,
  cct.net_terms
FROM orders o
JOIN customer_credit_terms cct ON o.customer_id = cct.customer_id
WHERE o.credit_amount_used IS NOT NULL 
  AND o.credit_amount_used > 0;
```

This view enables:
- Admin visibility into credit usage per order
- Identification of overdue orders
- Credit portfolio reporting

#### 1.3 Update Credit Eligibility Function

Enhance `check_credit_eligibility` to also check trust tier:

```sql
-- Add trust tier check to eligibility
-- Must be 'trusted' or 'preferred' tier (not just loyalty Silver+)
SELECT trust_tier INTO v_trust_tier
FROM customer_trust_profiles
WHERE customer_id = p_customer_id;

IF v_trust_tier NOT IN ('trusted', 'preferred') THEN
  v_eligible := false;
  v_reasons := array_append(v_reasons, 'Needs Trusted or Preferred trust tier');
END IF;
```

### 2. Core Credit Application RPC

#### 2.1 `apply_credit_to_order` Function

This is the **critical server-side function** that atomically:
1. Validates credit eligibility at execution time
2. Locks available credit
3. Updates order with credit fields
4. Updates customer balance
5. Logs audit event

```sql
CREATE OR REPLACE FUNCTION public.apply_credit_to_order(
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_credit RECORD;
  v_trust_tier TEXT;
  v_has_overdue BOOLEAN;
  v_new_balance NUMERIC;
BEGIN
  -- Lock order row
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Prevent double-apply
  IF v_order.credit_amount_used IS NOT NULL AND v_order.credit_amount_used > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Credit already applied to this order');
  END IF;
  
  -- Get credit terms (lock row)
  SELECT * INTO v_credit 
  FROM customer_credit_terms 
  WHERE customer_id = v_order.customer_id FOR UPDATE;
  
  IF v_credit IS NULL OR v_credit.status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active credit terms');
  END IF;
  
  -- Check trust tier
  SELECT trust_tier INTO v_trust_tier
  FROM customer_trust_profiles
  WHERE customer_id = v_order.customer_id;
  
  IF v_trust_tier NOT IN ('trusted', 'preferred') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trust tier too low for credit');
  END IF;
  
  -- Check for overdue balances
  SELECT EXISTS (
    SELECT 1 FROM orders
    WHERE customer_id = v_order.customer_id
      AND credit_due_date < CURRENT_DATE
      AND payment_status NOT IN ('fully_paid', 'overpaid')
      AND credit_amount_used > 0
  ) INTO v_has_overdue;
  
  IF v_has_overdue THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot use credit with overdue balances');
  END IF;
  
  -- Check available credit
  IF (v_credit.credit_limit - v_credit.current_balance) < v_order.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credit available');
  END IF;
  
  -- Calculate new balance and due date
  v_new_balance := v_credit.current_balance + v_order.total_amount;
  
  -- Update order with credit info
  UPDATE orders SET
    credit_amount_used = total_amount,
    credit_terms_days = CASE v_credit.net_terms
      WHEN 'net_7' THEN 7
      WHEN 'net_14' THEN 14
      WHEN 'net_30' THEN 30
      ELSE 14
    END,
    credit_due_date = CURRENT_DATE + CASE v_credit.net_terms
      WHEN 'net_7' THEN 7
      WHEN 'net_14' THEN 14
      WHEN 'net_30' THEN 30
      ELSE 14
    END,
    payment_method = 'credit',
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Update credit balance
  UPDATE customer_credit_terms SET
    current_balance = v_new_balance,
    updated_at = now()
  WHERE customer_id = v_order.customer_id;
  
  -- Audit log
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action, 
    event_data, severity, user_id
  ) VALUES (
    'credit_applied', 'orders', p_order_id::text, 'apply_credit',
    jsonb_build_object(
      'order_number', v_order.order_number,
      'amount', v_order.total_amount,
      'net_terms', v_credit.net_terms,
      'old_balance', v_credit.current_balance,
      'new_balance', v_new_balance
    ),
    'high', auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'credit_used', v_order.total_amount,
    'due_date', CURRENT_DATE + CASE v_credit.net_terms
      WHEN 'net_7' THEN 7
      WHEN 'net_14' THEN 14
      WHEN 'net_30' THEN 30
      ELSE 14
    END,
    'new_balance', v_new_balance
  );
END;
$$;
```

#### 2.2 `release_credit_from_order` Function

For order cancellation scenarios:

```sql
CREATE OR REPLACE FUNCTION public.release_credit_from_order(
  p_order_id UUID
)
RETURNS JSONB
-- Reverses credit usage when order is cancelled
-- Only callable by admin/super_admin
-- Logs with high severity
```

### 3. Frontend Implementation

#### 3.1 Enhanced Credit Eligibility Hook

Update `useCheckCreditEligibility` to include trust tier check:

```typescript
// src/hooks/useCustomerCreditTerms.ts

export interface CreditEligibility {
  eligible: boolean;
  lifetime_orders: number;
  loyalty_tier: string;
  trust_tier: string;        // NEW
  has_overdue_invoices: boolean;
  has_overdue_credit: boolean;  // NEW
  available_credit: number;     // NEW
  missing_requirements: string[];
}
```

#### 3.2 Credit Payment Option Component

New component for customer portal payment selection:

```typescript
// src/components/credit/CreditPaymentOption.tsx

interface CreditPaymentOptionProps {
  orderId: string;
  orderTotal: number;
  onSelect: () => void;
  onApply: () => Promise<void>;
}

export function CreditPaymentOption({ ... }) {
  const { data: creditTerms } = useCustomerCreditTerms(customerId);
  const { data: eligibility } = useCheckCreditEligibility(customerId);
  
  // Show available credit, due date preview
  // Disabled state with explanation if not eligible
}
```

#### 3.3 Admin Credit Ledger Panel

New component for viewing customer credit history:

```typescript
// src/components/credit/CreditLedgerPanel.tsx

interface CreditLedgerPanelProps {
  customerId: string;
}

// Shows:
// - Table of orders using credit
// - Due dates with overdue highlighting
// - Payment status per order
// - Total outstanding vs paid
```

#### 3.4 Customer Portal Credit Status Widget

Optional widget for customer dashboard:

```typescript
// src/components/credit/CustomerCreditStatus.tsx

// Shows simplified view:
// - Available credit amount
// - Next due date (if any)
// - "Account in good standing" or warning
// Does NOT expose internal scores or tier names
```

### 4. Order Creation Flow Integration

#### 4.1 Payment Method Selection

When creating/converting orders, add credit option:

```typescript
// In QuoteToOrderConverter.tsx or order creation flow

const paymentMethods = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'cash', label: 'Cash on Delivery' },
  // Conditionally show credit option
  ...(creditEligible ? [{
    value: 'credit',
    label: `Pay on Credit (${getNetTermsLabel(creditTerms.net_terms)})`,
    description: `Available: ${formatCreditAmount(availableCredit)}`
  }] : [])
];
```

#### 4.2 Credit Application on Order Confirmation

When order is confirmed with credit payment:

```typescript
// After order creation, if payment_method === 'credit'
const result = await supabase.rpc('apply_credit_to_order', {
  p_order_id: orderId
});

if (!result.data.success) {
  // Show error, revert to other payment method
  toast.error(result.data.error);
}
```

### 5. Safety Guardrails

#### 5.1 Overdue Balance Blocking

Orders past due do NOT auto-cancel or auto-block. Instead:
- Flag in admin UI with visual indicator
- Block NEW credit usage for that customer
- Surface warning in customer portal
- Trust tier may be affected on next evaluation

#### 5.2 No Automation

This phase explicitly does NOT add:
- Auto-collection
- Auto-penalties
- Auto-suspension
- Interest or fees

All enforcement is manual (future Phase 5.5).

#### 5.3 RLS Policies for Ledger View

```sql
-- Customers can see their own credit usage
CREATE POLICY "Customers can view own credit ledger"
ON orders FOR SELECT
USING (
  customer_id IN (
    SELECT cu.customer_id FROM customer_users cu 
    WHERE cu.user_id = auth.uid()
  )
);

-- Staff can view all credit data
-- (existing policies cover this)
```

### 6. File Structure

```text
src/
├── hooks/
│   └── useCustomerCreditTerms.ts   # UPDATE: Enhanced eligibility
├── components/
│   └── credit/
│       ├── CreditTermsPanel.tsx    # EXISTS: Admin credit management
│       ├── CreditPaymentOption.tsx # NEW: Customer payment selection
│       ├── CreditLedgerPanel.tsx   # NEW: Admin credit usage history
│       └── CustomerCreditStatus.tsx # NEW: Customer dashboard widget
├── utils/
│   └── creditHelpers.ts            # UPDATE: Add overdue helpers
└── pages/
    └── CustomerPortalMain.tsx      # UPDATE: Add credit status widget
```

### 7. Audit Event Types

Add to `AuditEventType` in `auditLogger.ts`:

```typescript
// Phase 5.2: Credit events
| 'credit_applied'
| 'credit_released'
| 'credit_payment_received'
```

---

## Definition of Done

- [ ] Credit fields added to orders table (additive, non-breaking)
- [ ] `apply_credit_to_order` RPC validates all eligibility rules
- [ ] Credit option appears only for eligible customers
- [ ] Overdue balances block new credit usage
- [ ] Admin can view credit ledger per customer
- [ ] Customer sees simplified credit status (no internal scores)
- [ ] All credit operations logged with high severity
- [ ] No existing payment or order workflows are bypassed
- [ ] No automation is introduced (manual enforcement only)
- [ ] Trust tier integration: requires `trusted` or `preferred`

---

## Testing Checklist

- [ ] Customer with `new` trust tier cannot use credit
- [ ] Customer with `preferred` tier and active credit CAN use credit
- [ ] Credit application fails if available credit insufficient
- [ ] Credit application fails if overdue balance exists
- [ ] Order cancellation releases credit back to available
- [ ] Payment verification updates credit balance correctly
- [ ] Audit logs capture all credit operations
- [ ] Customer portal shows credit option only when eligible
- [ ] Admin ledger shows all credit usage with due dates

---

## Technical Notes

### Relationship to Phase 3B
Phase 5.2 **extends** Phase 3B infrastructure:
- Uses existing `customer_credit_terms` table
- Uses existing admin approval flow
- Adds ORDER-LEVEL credit tracking (new)
- Integrates with trust tier (new)

### Balance Reconciliation
When a customer pays an order that used credit:
1. Admin verifies payment via existing `VerifyPaymentDialog`
2. Payment verification updates `orders.payment_status`
3. A trigger or RPC updates `customer_credit_terms.current_balance`
4. Available credit increases accordingly

This maintains existing payment verification flow.

### Credit vs Partial Payment
- Credit covers the FULL order amount
- Partial credit is NOT supported in Phase 5.2
- If customer can't afford full order on credit, they must use another payment method
