
# Phase 3B Implementation Plan: Controlled Financial Leverage

## Executive Summary

This plan introduces **guarded financial leverage mechanisms** through three independent, opt-in systems: Customer Credit Terms, Subscription Enforcement (Soft), and Loyalty Benefits. All systems are super_admin controlled, per-customer scoped, and reversible with comprehensive audit logging.

---

## Current State Analysis

### Existing Infrastructure from Phase 3A

| Component | Status | Relevance |
|-----------|--------|-----------|
| `customer_loyalty` table | Exists | Source for eligibility checks |
| `subscriptions` table | Exists | Enforcement target |
| `commercialSignals.ts` | Exists | `isCreditCandidate()` function ready |
| `loyaltyHelpers.ts` | Exists | Tier calculation utilities |
| `useCustomerLoyalty.ts` | Exists | Pattern for data fetching |
| `BillingSettingsTab.tsx` | Exists | Pattern for super_admin UI |
| `audit_logs` table | Exists | Logging destination |
| `user_roles` table | Exists | Role-based access control |

### Key Phase 1-2 Constraints to Preserve

| System | Constraint |
|--------|------------|
| Orders | `orders` table unchanged - no foreign keys to credit |
| Payments | `payment_records`, `payment_transactions` unchanged |
| RLS | All existing policies on orders/quotes/payments preserved |
| Operations Hub | Queue logic unchanged except badge additions |
| SLA Engine | `slaHelpers.ts` unchanged unless benefit explicitly enabled |

---

## Implementation Scope

### 3B.1 - Customer Credit Terms

**Purpose**: Allow trusted customers to place orders with deferred payment (Net 7/14/30) within strict limits.

**Database Table: `customer_credit_terms`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `customer_id` | uuid | FK to customers, UNIQUE |
| `credit_limit` | numeric(15,2) | NOT NULL, >= 0 |
| `current_balance` | numeric(15,2) | DEFAULT 0, >= 0 |
| `net_terms` | text | ENUM: 'net_7', 'net_14', 'net_30' |
| `status` | text | ENUM: 'inactive', 'active', 'suspended' |
| `approved_by` | uuid | FK to auth.users |
| `approved_at` | timestamptz | Nullable |
| `suspended_at` | timestamptz | Nullable |
| `suspended_reason` | text | Nullable |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | Auto-updated |

**RPC Function: `approve_credit_terms`**

```text
Parameters:
- p_customer_id: uuid
- p_credit_limit: numeric
- p_net_terms: text ('net_7', 'net_14', 'net_30')

Validation:
1. Caller must be super_admin
2. Customer must meet ALL eligibility requirements:
   - isRepeatBuyer(customer) = true (lifetime_orders >= 2)
   - loyalty_tier IN ('silver', 'gold')
   - No overdue invoices
3. Credit limit must be > 0

Returns:
- Success: credit_terms record
- Failure: Error with reason (eligibility_failed, unauthorized, etc.)
```

**Hard Enforcement Rules (Database Level)**

```sql
-- Constraint: current_balance never exceeds credit_limit
ALTER TABLE customer_credit_terms
ADD CONSTRAINT credit_balance_check 
CHECK (current_balance <= credit_limit);

-- Constraint: credit_limit must be positive when active
ALTER TABLE customer_credit_terms
ADD CONSTRAINT credit_limit_positive 
CHECK (credit_limit >= 0);
```

---

### 3B.2 - Subscription Enforcement (Soft Only)

**Purpose**: Surface subscription status to admins without blocking operations.

**Enforcement Level: Soft Only (Phase 3B)**

| Feature | Behavior |
|---------|----------|
| Admin Portal | Yellow warning banner when `past_due` or `canceled` |
| Customer Portal | Non-blocking "Plan status" indicator |
| Order Creation | Unchanged - never blocked |
| Analytics/Exports | Unchanged - no restrictions in Phase 3B |

**No Database Changes Required** - Uses existing `subscriptions` table.

**New Components**:
- `SubscriptionStatusBanner.tsx` - Admin warning component
- `useSubscriptionEnforcement.ts` - Hook for status checks

---

### 3B.3 - Loyalty Benefits (Non-Monetary)

**Purpose**: Reward loyal customers with operational advantages, not discounts.

**Database Table: `customer_benefits`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `customer_id` | uuid | FK to customers, UNIQUE per benefit_type |
| `benefit_type` | text | ENUM (see below) |
| `enabled` | boolean | DEFAULT false |
| `enabled_by` | uuid | FK to auth.users |
| `enabled_at` | timestamptz | Nullable |
| `disabled_at` | timestamptz | Nullable |
| `created_at` | timestamptz | DEFAULT now() |
| `updated_at` | timestamptz | Auto-updated |

**Allowed Benefit Types (Phase 3B)**

| Type | Effect |
|------|--------|
| `priority_processing` | Orders float to top of Operations Hub queues |
| `dedicated_manager` | Visual indicator + assignment preference |
| `faster_sla` | SLA thresholds reduced by 25% for this customer |

**Explicitly Excluded Benefits**

- `discount_*` - No discount types
- `credit_*` - Covered by credit terms system
- `cashback` - No cash-equivalent benefits

---

### 3B.4 - Kill Switches & Audit Logging

**Kill Switch Table: `system_feature_flags`**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `feature_key` | text | UNIQUE |
| `enabled` | boolean | DEFAULT true |
| `disabled_by` | uuid | Nullable |
| `disabled_at` | timestamptz | Nullable |
| `disabled_reason` | text | Nullable |

**Feature Keys**:
- `credit_terms_global` - Master switch for all credit
- `subscription_enforcement` - Master switch for enforcement
- `loyalty_benefits_global` - Master switch for all benefits

**Audit Events (High Severity)**

| Event Type | When Logged |
|------------|-------------|
| `credit_terms_approved` | Credit activated for customer |
| `credit_terms_suspended` | Credit suspended |
| `credit_terms_limit_changed` | Limit adjusted |
| `credit_balance_updated` | Balance changed (invoice/payment) |
| `benefit_enabled` | Loyalty benefit activated |
| `benefit_disabled` | Loyalty benefit deactivated |
| `feature_flag_changed` | Kill switch toggled |

---

## Implementation Details

### Step 1: Database Migration

**Migration: Create Phase 3B tables**

```sql
-- Customer Credit Terms
CREATE TABLE public.customer_credit_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  credit_limit NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  current_balance NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  net_terms TEXT NOT NULL DEFAULT 'net_14' CHECK (net_terms IN ('net_7', 'net_14', 'net_30')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'active', 'suspended')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id),
  CONSTRAINT credit_balance_within_limit CHECK (current_balance <= credit_limit)
);

-- Customer Benefits
CREATE TABLE public.customer_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('priority_processing', 'dedicated_manager', 'faster_sla')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, benefit_type)
);

-- System Feature Flags (Kill Switches)
CREATE TABLE public.system_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  disabled_by UUID REFERENCES auth.users(id),
  disabled_at TIMESTAMPTZ,
  disabled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default feature flags
INSERT INTO public.system_feature_flags (feature_key, enabled) VALUES
  ('credit_terms_global', true),
  ('subscription_enforcement', true),
  ('loyalty_benefits_global', true);
```

**RLS Policies**

```sql
-- Credit Terms: Super admin manages, admins view
ALTER TABLE customer_credit_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage credit terms"
  ON customer_credit_terms FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view credit terms"
  ON customer_credit_terms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Customer Benefits: Same pattern
ALTER TABLE customer_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage benefits"
  ON customer_benefits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view benefits"
  ON customer_benefits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Feature Flags: Super admin only
ALTER TABLE system_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage feature flags"
  ON system_feature_flags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view feature flags"
  ON system_feature_flags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
```

---

### Step 2: RPC Functions (Secure Credit Operations)

**Function: `approve_credit_terms`**

```sql
CREATE OR REPLACE FUNCTION public.approve_credit_terms(
  p_customer_id UUID,
  p_credit_limit NUMERIC,
  p_net_terms TEXT DEFAULT 'net_14'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_loyalty_data RECORD;
  v_has_overdue BOOLEAN;
  v_credit_enabled BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check caller is super_admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Only super admins can approve credit terms');
  END IF;
  
  -- Check global kill switch
  SELECT enabled INTO v_credit_enabled
  FROM system_feature_flags
  WHERE feature_key = 'credit_terms_global';
  
  IF NOT COALESCE(v_credit_enabled, true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'feature_disabled', 'message', 'Credit terms are globally disabled');
  END IF;
  
  -- Validate net_terms
  IF p_net_terms NOT IN ('net_7', 'net_14', 'net_30') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_terms', 'message', 'Net terms must be net_7, net_14, or net_30');
  END IF;
  
  -- Validate credit limit
  IF p_credit_limit <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_limit', 'message', 'Credit limit must be greater than 0');
  END IF;
  
  -- Get loyalty data
  SELECT lifetime_orders, loyalty_tier INTO v_loyalty_data
  FROM customer_loyalty
  WHERE customer_id = p_customer_id;
  
  -- Check eligibility: repeat buyer (2+ orders)
  IF COALESCE(v_loyalty_data.lifetime_orders, 0) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'eligibility_failed', 'message', 'Customer must have at least 2 completed orders');
  END IF;
  
  -- Check eligibility: loyalty tier >= silver
  IF COALESCE(v_loyalty_data.loyalty_tier, 'bronze') = 'bronze' THEN
    RETURN jsonb_build_object('success', false, 'error', 'eligibility_failed', 'message', 'Customer must be Silver tier or higher');
  END IF;
  
  -- Check for overdue invoices
  SELECT EXISTS (
    SELECT 1 FROM invoices
    WHERE customer_id = p_customer_id
    AND status = 'overdue'
  ) INTO v_has_overdue;
  
  IF v_has_overdue THEN
    RETURN jsonb_build_object('success', false, 'error', 'eligibility_failed', 'message', 'Customer has overdue invoices');
  END IF;
  
  -- Upsert credit terms
  INSERT INTO customer_credit_terms (
    customer_id,
    credit_limit,
    net_terms,
    status,
    approved_by,
    approved_at,
    current_balance
  ) VALUES (
    p_customer_id,
    p_credit_limit,
    p_net_terms,
    'active',
    auth.uid(),
    now(),
    0
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    credit_limit = p_credit_limit,
    net_terms = p_net_terms,
    status = 'active',
    approved_by = auth.uid(),
    approved_at = now(),
    suspended_at = NULL,
    suspended_reason = NULL,
    updated_at = now();
  
  -- Log audit event
  INSERT INTO audit_logs (
    event_type,
    resource_type,
    resource_id,
    action,
    event_data,
    severity,
    user_id
  ) VALUES (
    'credit_terms_approved',
    'customer_credit_terms',
    p_customer_id::text,
    'approve',
    jsonb_build_object(
      'credit_limit', p_credit_limit,
      'net_terms', p_net_terms,
      'approved_by', auth.uid()
    ),
    'high',
    auth.uid()
  );
  
  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id, 'credit_limit', p_credit_limit, 'net_terms', p_net_terms);
END;
$$;
```

**Function: `suspend_credit_terms`**

```sql
CREATE OR REPLACE FUNCTION public.suspend_credit_terms(
  p_customer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  
  -- Update status
  UPDATE customer_credit_terms
  SET 
    status = 'suspended',
    suspended_at = now(),
    suspended_reason = p_reason,
    updated_at = now()
  WHERE customer_id = p_customer_id;
  
  -- Log audit event
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action, event_data, severity, user_id
  ) VALUES (
    'credit_terms_suspended', 'customer_credit_terms', p_customer_id::text,
    'suspend', jsonb_build_object('reason', p_reason), 'high', auth.uid()
  );
  
  RETURN jsonb_build_object('success', true);
END;
$$;
```

**Function: `check_credit_eligibility`**

```sql
CREATE OR REPLACE FUNCTION public.check_credit_eligibility(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_loyalty_data RECORD;
  v_has_overdue BOOLEAN;
  v_eligible BOOLEAN := true;
  v_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get loyalty data
  SELECT lifetime_orders, loyalty_tier INTO v_loyalty_data
  FROM customer_loyalty
  WHERE customer_id = p_customer_id;
  
  -- Check repeat buyer
  IF COALESCE(v_loyalty_data.lifetime_orders, 0) < 2 THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Needs 2+ completed orders');
  END IF;
  
  -- Check tier
  IF COALESCE(v_loyalty_data.loyalty_tier, 'bronze') = 'bronze' THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Needs Silver tier or higher');
  END IF;
  
  -- Check overdue invoices
  SELECT EXISTS (
    SELECT 1 FROM invoices
    WHERE customer_id = p_customer_id AND status = 'overdue'
  ) INTO v_has_overdue;
  
  IF v_has_overdue THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Has overdue invoices');
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'lifetime_orders', COALESCE(v_loyalty_data.lifetime_orders, 0),
    'loyalty_tier', COALESCE(v_loyalty_data.loyalty_tier, 'bronze'),
    'has_overdue_invoices', v_has_overdue,
    'missing_requirements', v_reasons
  );
END;
$$;
```

---

### Step 3: Utility Files

**File: `src/utils/creditHelpers.ts`**

```text
Types:
- CreditTerms
- NetTerms ('net_7' | 'net_14' | 'net_30')
- CreditStatus ('inactive' | 'active' | 'suspended')

Functions:
- getNetTermsDays(terms: NetTerms) → number (7, 14, or 30)
- getNetTermsLabel(terms: NetTerms) → string
- getCreditUtilization(balance, limit) → percentage
- getAvailableCredit(limit, balance) → numeric
- formatCreditAmount(amount) → formatted string
- getCreditStatusColor(status) → CSS class
```

**File: `src/utils/benefitHelpers.ts`**

```text
Types:
- BenefitType ('priority_processing' | 'dedicated_manager' | 'faster_sla')
- CustomerBenefit

Functions:
- getBenefitLabel(type) → string
- getBenefitDescription(type) → string
- getBenefitIcon(type) → Lucide icon
- hasBenefit(benefits, type) → boolean
```

---

### Step 4: Hooks

**File: `src/hooks/useCustomerCreditTerms.ts`**

```text
Functions:
- useCustomerCreditTerms(customerId)
  → { creditTerms, isLoading, eligibility }
- useCreditTermsMutations()
  → { approveCreditTerms, suspendCreditTerms, adjustLimit }
- useCheckCreditEligibility(customerId)
  → { eligible, reasons, isLoading }
```

**File: `src/hooks/useCustomerBenefits.ts`**

```text
Functions:
- useCustomerBenefits(customerId)
  → { benefits, isLoading }
- useBenefitMutations()
  → { enableBenefit, disableBenefit }
```

**File: `src/hooks/useFeatureFlags.ts`**

```text
Functions:
- useFeatureFlags()
  → { flags, isLoading }
- useFeatureFlagMutations()
  → { toggleFlag }
- useIsFeatureEnabled(key)
  → boolean
```

---

### Step 5: UI Components

**File: `src/components/credit/CreditTermsPanel.tsx`**

Features:
- Credit limit display with utilization bar
- Current balance indicator
- Net terms badge (Net 7/14/30)
- Status badge (Active/Suspended/Inactive)
- Eligibility check display
- Actions: Approve, Suspend, Adjust Limit (super_admin)
- Audit trail of credit changes

**File: `src/components/credit/CreditEligibilityCard.tsx`**

Features:
- Visual checklist of eligibility requirements
- Pass/fail status for each requirement
- "Request Credit Approval" button (initiates workflow)

**File: `src/components/benefits/BenefitsBadge.tsx`**

Features:
- Compact badge showing active benefits
- Tooltip with benefit details
- Color-coded by benefit type

**File: `src/components/benefits/CustomerBenefitsPanel.tsx`**

Features:
- List of available benefits with toggle switches
- Enabled/disabled state per benefit
- Audit info (who enabled, when)
- super_admin only controls

**File: `src/components/enforcement/SubscriptionStatusBanner.tsx`**

Features:
- Yellow warning banner for `past_due`
- Red warning banner for `canceled`
- Dismissible (per session)
- Link to billing settings

**File: `src/components/admin/KillSwitchPanel.tsx`**

Features:
- Toggle switches for each feature flag
- Confirmation dialog before disabling
- Reason input when disabling
- Audit trail display

---

### Step 6: Integration Changes

**Modified: `src/components/crm/UnifiedCustomerView.tsx`**

```text
Changes:
- Import CreditTermsPanel, CustomerBenefitsPanel
- Add "Credit" tab to customer detail tabs
- Add "Benefits" section to customer header
- Show credit utilization badge if active
```

**Modified: `src/pages/admin/OperationsHub.tsx`**

```text
Changes:
- Import BenefitsBadge
- Add priority indicator for customers with priority_processing benefit
- Adjust queue sorting to float priority customers up
```

**Modified: `src/pages/Settings.tsx`**

```text
Changes:
- Import KillSwitchPanel
- Add "Kill Switches" section to Super Admin tab
```

**Modified: `src/utils/slaHelpers.ts`**

```text
Changes (Additive Only):
- New function: getSLAThresholdsForCustomer(customerId, benefits)
  - If 'faster_sla' benefit enabled, reduce thresholds by 25%
  - Otherwise return standard thresholds
- Existing calculateSLA remains unchanged unless benefit is passed
```

---

## Files Summary

### New Files (15)

| File | Lines (est.) | Purpose |
|------|--------------|---------|
| `src/utils/creditHelpers.ts` | ~80 | Credit calculation utilities |
| `src/utils/benefitHelpers.ts` | ~60 | Benefit display utilities |
| `src/hooks/useCustomerCreditTerms.ts` | ~150 | Credit terms data/mutations |
| `src/hooks/useCustomerBenefits.ts` | ~100 | Benefits data/mutations |
| `src/hooks/useFeatureFlags.ts` | ~80 | Kill switch management |
| `src/components/credit/CreditTermsPanel.tsx` | ~300 | Admin credit management UI |
| `src/components/credit/CreditEligibilityCard.tsx` | ~150 | Eligibility display |
| `src/components/benefits/BenefitsBadge.tsx` | ~80 | Visual benefit indicator |
| `src/components/benefits/CustomerBenefitsPanel.tsx` | ~200 | Admin benefit toggles |
| `src/components/enforcement/SubscriptionStatusBanner.tsx` | ~80 | Status warning |
| `src/components/admin/KillSwitchPanel.tsx` | ~200 | Feature flag controls |
| `supabase/migrations/phase3b_credit_terms.sql` | ~200 | Database migration |

### Modified Files (4)

| File | Changes |
|------|---------|
| `src/components/crm/UnifiedCustomerView.tsx` | Add Credit tab, Benefits section |
| `src/pages/admin/OperationsHub.tsx` | Priority badge, queue sorting |
| `src/pages/Settings.tsx` | Kill switch panel in Super Admin |
| `src/utils/slaHelpers.ts` | Add customer-specific threshold function |

---

## Safety Verification Matrix

### Financial Safety

| Check | Implementation |
|-------|----------------|
| Credit never exceeds limit | Database CHECK constraint |
| Credit applied only to approved customers | RPC function validation |
| No automatic credit approvals | Super admin approval required |
| Payments reconcile correctly | Balance updates via audit-logged RPC |
| Kill switch stops all credit | `credit_terms_global` flag check |

### Operational Safety

| Check | Implementation |
|-------|----------------|
| Operations queues still function | Badge-only additions, optional priority |
| SLA logic unchanged by default | Only modified when `faster_sla` benefit passed |
| Bulk operations unaffected | No changes to bulk action logic |
| Order creation never blocked | No FK or constraint to orders |

### Access Safety

| Check | Implementation |
|-------|----------------|
| RLS enforced via RPC only | SECURITY DEFINER functions |
| Customers cannot mutate credit data | No customer access policies |
| Super admin cannot bypass audit logs | Logs in same transaction as action |
| All mutations logged | High severity audit events |

---

## Explicit Non-Goals

| Feature | Status |
|---------|--------|
| Automatic credit approvals | NOT IMPLEMENTED |
| Auto-increasing limits | NOT IMPLEMENTED |
| Interest or penalties | NOT IMPLEMENTED |
| Bulk credit assignment | NOT IMPLEMENTED |
| Hard order blocking | NOT IMPLEMENTED |
| Price mutation | NOT IMPLEMENTED |
| Discounts or cashback | NOT IMPLEMENTED |

---

## Testing Checklist

### Credit Terms
- [ ] Super admin can approve credit for eligible customer
- [ ] Ineligible customers rejected with reason
- [ ] Credit limit enforced at database level
- [ ] Balance updates logged
- [ ] Suspend/reactivate works correctly
- [ ] Kill switch disables all credit operations

### Benefits
- [ ] Super admin can enable/disable benefits
- [ ] Priority processing affects queue sorting
- [ ] Faster SLA reduces thresholds for customer
- [ ] Benefits badge displays correctly
- [ ] Kill switch disables all benefits

### Subscription Enforcement
- [ ] Warning banner appears for past_due
- [ ] Warning banner appears for canceled
- [ ] No operations are blocked
- [ ] Order creation unaffected

### Audit & Safety
- [ ] All credit changes logged
- [ ] All benefit changes logged
- [ ] Kill switch changes logged
- [ ] Admins can view but not modify credit
- [ ] Customers cannot see credit limits

---

## Success Criteria

Phase 3B is complete when:

1. Credit terms work for 1-3 trusted customers
2. No existing workflows break
3. Credit exposure is visible at all times
4. Benefits provide operational value without financial risk
5. Super admin can disable everything instantly
6. All changes are audit-logged with high severity
