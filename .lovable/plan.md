
# Phase 5.1 Implementation Plan: Customer Trust & Tiering

## Overview

This phase introduces a **measured, explainable trust system** that evaluates customer reliability over time and unlocks eligibility for future growth features. This is a **read-only foundation** that prepares for Phase 5.2+ (credit terms, subscriptions, priority handling) without changing any existing workflows.

---

## Current State Analysis

### Existing Infrastructure (Leverage Points)
- **`customer_loyalty` table**: Already tracks `lifetime_orders`, `lifetime_revenue`, `loyalty_tier` (bronze/silver/gold)
- **`loyaltyHelpers.ts`**: Client-side tier calculation functions
- **`LoyaltyBadge` component**: Displays loyalty tiers with icons/tooltips
- **`order_issues` table**: Tracks disputes with status (submitted/reviewing/resolved/rejected)
- **`orders` table**: Has `payment_status` enum (unpaid/partially_paid/fully_paid/overpaid)
- **Audit logging**: Mature `AuditLogger` class with severity levels
- **Role-based access**: `useRoleAuth` hook with `hasSuperAdminAccess`
- **RPC pattern**: `check_user_role` function for secure role checks

### Key Insight
The existing `customer_loyalty` table uses a simple order-count-based tier system. Phase 5.1 introduces a **separate trust profile** that considers **behavioral signals** (payment punctuality, disputes, manual flags) rather than just volume metrics.

---

## Database Schema

### 1. Create Trust Tier Enum

```sql
CREATE TYPE public.customer_trust_tier AS ENUM (
  'new',        -- No history
  'verified',   -- Paid at least once on time
  'trusted',    -- Consistent, on-time payments
  'preferred',  -- High volume, low risk
  'restricted'  -- Late payments or disputes
);
```

### 2. Create `customer_trust_profiles` Table

```sql
CREATE TABLE public.customer_trust_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  trust_tier customer_trust_tier NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  
  -- Evaluation tracking
  last_evaluated_at TIMESTAMPTZ,
  evaluation_version INTEGER DEFAULT 1,
  
  -- Manual override controls
  manual_override BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One profile per customer
  UNIQUE(customer_id)
);

-- Indexes for performance
CREATE INDEX idx_trust_profiles_customer ON customer_trust_profiles(customer_id);
CREATE INDEX idx_trust_profiles_tier ON customer_trust_profiles(trust_tier);
CREATE INDEX idx_trust_profiles_score ON customer_trust_profiles(score);
```

### 3. Create `customer_trust_history` Table (Audit Trail)

```sql
CREATE TABLE public.customer_trust_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  previous_tier customer_trust_tier,
  new_tier customer_trust_tier NOT NULL,
  previous_score INTEGER,
  new_score INTEGER NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id), -- NULL for system
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_history_customer ON customer_trust_history(customer_id);
CREATE INDEX idx_trust_history_created ON customer_trust_history(created_at DESC);
```

### 4. RLS Policies

```sql
-- Enable RLS
ALTER TABLE customer_trust_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_trust_history ENABLE ROW LEVEL SECURITY;

-- Staff can read all trust profiles
CREATE POLICY "Staff can read trust profiles"
ON customer_trust_profiles FOR SELECT
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'admin') OR
  public.check_user_role(auth.uid(), 'super_admin') OR
  public.check_user_role(auth.uid(), 'sales_rep')
);

-- Only super_admin can modify trust profiles
CREATE POLICY "Super admin can modify trust profiles"
ON customer_trust_profiles FOR ALL
TO authenticated
USING (public.check_user_role(auth.uid(), 'super_admin'))
WITH CHECK (public.check_user_role(auth.uid(), 'super_admin'));

-- Customers can read their own trust tier (limited view)
CREATE POLICY "Customers can read own trust profile"
ON customer_trust_profiles FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT cu.customer_id FROM customer_users cu WHERE cu.user_id = auth.uid()
  )
);

-- Trust history: read-only for admin+
CREATE POLICY "Staff can read trust history"
ON customer_trust_history FOR SELECT
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'admin') OR
  public.check_user_role(auth.uid(), 'super_admin')
);
```

### 5. Trust Evaluation Function (Server-Side RPC)

```sql
CREATE OR REPLACE FUNCTION public.evaluate_customer_trust(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_orders INTEGER;
  v_total_orders INTEGER;
  v_on_time_payments INTEGER;
  v_late_payments INTEGER;
  v_disputed_orders INTEGER;
  v_resolved_disputes INTEGER;
  v_unresolved_disputes INTEGER;
  v_score INTEGER;
  v_tier customer_trust_tier;
  v_existing_tier customer_trust_tier;
  v_existing_score INTEGER;
  v_has_manual_override BOOLEAN;
  v_payment_ratio NUMERIC;
BEGIN
  -- Get existing profile
  SELECT trust_tier, score, manual_override 
  INTO v_existing_tier, v_existing_score, v_has_manual_override
  FROM customer_trust_profiles
  WHERE customer_id = p_customer_id;
  
  -- If manual override is active, do not recalculate
  IF v_has_manual_override THEN
    RETURN jsonb_build_object(
      'success', true,
      'skipped', true,
      'reason', 'Manual override active',
      'tier', v_existing_tier::text,
      'score', v_existing_score
    );
  END IF;

  -- Count completed orders (delivered)
  SELECT COUNT(*) INTO v_completed_orders
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'delivered';

  -- Count total non-cancelled orders
  SELECT COUNT(*) INTO v_total_orders
  FROM orders
  WHERE customer_id = p_customer_id
    AND status NOT IN ('cancelled', 'quote_pending', 'quote_sent');

  -- Count on-time payments (fully_paid or overpaid)
  SELECT COUNT(*) INTO v_on_time_payments
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'delivered'
    AND payment_status IN ('fully_paid', 'overpaid');

  -- Count late/partial payments at delivery
  SELECT COUNT(*) INTO v_late_payments
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'delivered'
    AND (payment_status = 'partially_paid' OR payment_status = 'unpaid');

  -- Count disputes
  SELECT COUNT(*) INTO v_disputed_orders
  FROM order_issues
  WHERE customer_id = p_customer_id;

  SELECT COUNT(*) INTO v_unresolved_disputes
  FROM order_issues
  WHERE customer_id = p_customer_id
    AND status IN ('submitted', 'reviewing');

  SELECT COUNT(*) INTO v_resolved_disputes
  FROM order_issues
  WHERE customer_id = p_customer_id
    AND status = 'resolved';

  -- Calculate score (0-100)
  v_score := 50; -- Base score
  
  -- Completed orders bonus (+2 per order, max +20)
  v_score := v_score + LEAST(v_completed_orders * 2, 20);
  
  -- On-time payment ratio bonus (+25 max)
  IF v_completed_orders > 0 THEN
    v_payment_ratio := v_on_time_payments::NUMERIC / v_completed_orders;
    v_score := v_score + (v_payment_ratio * 25)::INTEGER;
  END IF;
  
  -- Late payment penalty (-5 per late payment)
  v_score := v_score - (v_late_payments * 5);
  
  -- Dispute penalty (-10 per unresolved, -3 per resolved)
  v_score := v_score - (v_unresolved_disputes * 10);
  v_score := v_score - (v_resolved_disputes * 3);
  
  -- Clamp score
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Determine tier based on score
  IF v_total_orders = 0 THEN
    v_tier := 'new';
  ELSIF v_score < 30 OR v_unresolved_disputes > 0 THEN
    v_tier := 'restricted';
  ELSIF v_score < 50 OR v_completed_orders = 0 THEN
    v_tier := 'new';
  ELSIF v_score < 65 THEN
    v_tier := 'verified';
  ELSIF v_score < 80 THEN
    v_tier := 'trusted';
  ELSE
    v_tier := 'preferred';
  END IF;

  -- Upsert trust profile
  INSERT INTO customer_trust_profiles (customer_id, trust_tier, score, last_evaluated_at)
  VALUES (p_customer_id, v_tier, v_score, now())
  ON CONFLICT (customer_id) DO UPDATE SET
    trust_tier = EXCLUDED.trust_tier,
    score = EXCLUDED.score,
    last_evaluated_at = now(),
    updated_at = now();

  -- Log tier change if changed
  IF v_existing_tier IS NOT NULL AND v_existing_tier != v_tier THEN
    INSERT INTO customer_trust_history (
      customer_id, previous_tier, new_tier, previous_score, new_score, change_reason
    ) VALUES (
      p_customer_id, v_existing_tier, v_tier, v_existing_score, v_score,
      'Automatic re-evaluation'
    );
  ELSIF v_existing_tier IS NULL THEN
    INSERT INTO customer_trust_history (
      customer_id, new_tier, new_score, change_reason
    ) VALUES (
      p_customer_id, v_tier, v_score, 'Initial evaluation'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'tier', v_tier::text,
    'score', v_score,
    'signals', jsonb_build_object(
      'completed_orders', v_completed_orders,
      'on_time_payments', v_on_time_payments,
      'late_payments', v_late_payments,
      'unresolved_disputes', v_unresolved_disputes
    )
  );
END;
$$;
```

### 6. Manual Override Function (Super Admin Only)

```sql
CREATE OR REPLACE FUNCTION public.override_customer_trust(
  p_customer_id UUID,
  p_new_tier customer_trust_tier,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_super_admin BOOLEAN;
  v_existing_tier customer_trust_tier;
  v_existing_score INTEGER;
BEGIN
  -- Verify super admin access
  SELECT public.check_user_role(v_caller_id, 'super_admin') INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Only super admins can override trust tiers'
    );
  END IF;

  -- Require reason
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'validation',
      'message', 'Override reason is required'
    );
  END IF;

  -- Get existing profile
  SELECT trust_tier, score INTO v_existing_tier, v_existing_score
  FROM customer_trust_profiles
  WHERE customer_id = p_customer_id;

  -- Upsert with override
  INSERT INTO customer_trust_profiles (
    customer_id, trust_tier, score, manual_override, 
    override_reason, override_by, override_at
  ) VALUES (
    p_customer_id, p_new_tier, 
    CASE p_new_tier 
      WHEN 'preferred' THEN 90
      WHEN 'trusted' THEN 75
      WHEN 'verified' THEN 60
      WHEN 'new' THEN 50
      WHEN 'restricted' THEN 20
    END,
    true, p_reason, v_caller_id, now()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    trust_tier = p_new_tier,
    manual_override = true,
    override_reason = p_reason,
    override_by = v_caller_id,
    override_at = now(),
    updated_at = now();

  -- Log the change
  INSERT INTO customer_trust_history (
    customer_id, previous_tier, new_tier, 
    previous_score, new_score, change_reason,
    changed_by, is_manual_override
  ) VALUES (
    p_customer_id, v_existing_tier, p_new_tier,
    v_existing_score,
    CASE p_new_tier 
      WHEN 'preferred' THEN 90
      WHEN 'trusted' THEN 75
      WHEN 'verified' THEN 60
      WHEN 'new' THEN 50
      WHEN 'restricted' THEN 20
    END,
    p_reason, v_caller_id, true
  );

  -- High severity audit log
  INSERT INTO audit_logs (
    user_id, event_type, action, resource_type, resource_id,
    severity, event_data
  ) VALUES (
    v_caller_id, 'role_changed', 'trust_tier_override', 'customer', p_customer_id::text,
    'high', jsonb_build_object(
      'previous_tier', v_existing_tier::text,
      'new_tier', p_new_tier::text,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'new_tier', p_new_tier::text,
    'overridden_by', v_caller_id
  );
END;
$$;
```

---

## Frontend Implementation

### 1. Trust Types & Helpers (`src/utils/trustHelpers.ts`)

```typescript
export type TrustTier = 'new' | 'verified' | 'trusted' | 'preferred' | 'restricted';

export interface TrustProfile {
  id: string;
  customer_id: string;
  trust_tier: TrustTier;
  score: number;
  last_evaluated_at: string | null;
  manual_override: boolean;
  override_reason: string | null;
}

export const TIER_CONFIG: Record<TrustTier, {
  label: string;
  description: string;
  color: string;
  iconColor: string;
  eligibilities: string[];
}> = {
  new: {
    label: 'New',
    description: 'New customer, no order history yet',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    iconColor: 'text-gray-500',
    eligibilities: []
  },
  verified: {
    label: 'Verified',
    description: 'Completed at least one order with on-time payment',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    iconColor: 'text-blue-500',
    eligibilities: ['Standard payment terms']
  },
  trusted: {
    label: 'Trusted',
    description: 'Consistent payment history, reliable customer',
    color: 'bg-green-100 text-green-700 border-green-300',
    iconColor: 'text-green-500',
    eligibilities: ['Priority processing', 'Extended payment terms eligible']
  },
  preferred: {
    label: 'Preferred',
    description: 'High volume, excellent payment record',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    iconColor: 'text-purple-500',
    eligibilities: ['Credit terms eligible', 'Priority processing', 'Subscription eligible']
  },
  restricted: {
    label: 'Restricted',
    description: 'Payment issues or unresolved disputes',
    color: 'bg-red-100 text-red-700 border-red-300',
    iconColor: 'text-red-500',
    eligibilities: ['Upfront payment only']
  }
};
```

### 2. Trust Hook (`src/hooks/useCustomerTrust.ts`)

```typescript
export function useCustomerTrust(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer-trust', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      
      const { data, error } = await supabase
        .from('customer_trust_profiles')
        .select('*')
        .eq('customer_id', customerId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching trust profile:', error);
        return null;
      }
      
      // If no profile, return default "new" status
      return data || {
        customer_id: customerId,
        trust_tier: 'new' as TrustTier,
        score: 50,
        manual_override: false
      };
    },
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000
  });
}

export function useEvaluateCustomerTrust() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await supabase
        .rpc('evaluate_customer_trust', { p_customer_id: customerId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: ['customer-trust', customerId] });
    }
  });
}

export function useOverrideCustomerTrust() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      customerId, 
      newTier, 
      reason 
    }: { 
      customerId: string; 
      newTier: TrustTier; 
      reason: string 
    }) => {
      const { data, error } = await supabase
        .rpc('override_customer_trust', { 
          p_customer_id: customerId,
          p_new_tier: newTier,
          p_reason: reason
        });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.message);
      return data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-trust', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-trust-history', customerId] });
    }
  });
}
```

### 3. TrustBadge Component (`src/components/trust/TrustBadge.tsx`)

Similar pattern to existing `LoyaltyBadge`:
- Display tier with icon (Shield variants)
- Tooltip showing tier description and eligibilities
- Variant support: compact/default/full
- Manual override indicator (lock icon)

### 4. Admin UI Integration

**CustomerDetailView.tsx Updates:**
- Add "Trust & Standing" card alongside existing stats
- Show TrustBadge with score
- Display trust signals (on-time %, disputes)
- "Re-evaluate" button (triggers RPC)
- "Override Tier" button (super_admin only, opens dialog)

**Trust History Panel:**
- Timeline of tier changes
- Distinguishes manual overrides from automatic evaluations
- Shows changed_by for manual overrides

### 5. Customer Portal Integration

**Optional "Account Standing" Display:**
- In CustomerPortalMain sidebar or header
- Show simplified tier badge (no internal score)
- Tooltip: "Your account standing based on order history"
- No "restricted" label exposed - show "Account Review Required" instead

---

## File Structure

```text
src/
├── utils/
│   └── trustHelpers.ts              # NEW: Trust tier types & config
├── hooks/
│   └── useCustomerTrust.ts          # NEW: Trust data fetching hooks
├── components/
│   └── trust/
│       ├── TrustBadge.tsx           # NEW: Trust tier badge component
│       ├── TrustHistoryPanel.tsx    # NEW: Trust change timeline
│       └── TrustOverrideDialog.tsx  # NEW: Super admin override dialog
└── components/
    ├── CustomerDetailView.tsx       # EDIT: Add trust card section
    └── customers/
        └── CustomerCard.tsx         # EDIT: Add trust badge (optional)

src/pages/
└── CustomerPortalMain.tsx           # EDIT: Add account standing display
```

---

## Audit Event Types

Add to `AuditEventType` in `auditLogger.ts`:
```typescript
// Phase 5.1: Trust events
| 'trust_tier_evaluated'
| 'trust_tier_changed'
| 'trust_tier_override'
```

---

## Safety Guarantees

1. **No Workflow Changes**: Trust tier is **informational only** - no auto-approvals, no bypassed payments
2. **Existing Loyalty Preserved**: `customer_loyalty` table remains untouched
3. **Manual Override Protection**: Super admin only, requires reason, logged with high severity
4. **Customer Privacy**: Customers see simplified "Account Standing", never see internal score
5. **Deterministic Scoring**: All signals are explicit and auditable

---

## Testing Checklist

- [ ] Trust profile created on first evaluation
- [ ] Score calculation matches documented formula
- [ ] Tier boundaries correct (verified at 65+, trusted at 80+, etc.)
- [ ] Manual override prevents automatic recalculation
- [ ] Override logged in audit_logs with high severity
- [ ] RLS prevents non-super_admin from modifying profiles
- [ ] Customer can only see their own trust tier
- [ ] Trust history records all tier changes
- [ ] Existing order/payment workflows unchanged

---

## Definition of Done

- Trust tiers are visible and stable
- No existing workflows are affected
- No automation is triggered by trust tier alone
- System behavior remains unchanged
- Foundation is ready for Phase 5.2 (Credit Terms)

---

## Technical Notes

### Relationship to Existing Loyalty System
- **Loyalty Tier** (bronze/silver/gold): Volume-based, rewards ordering frequency
- **Trust Tier** (new/verified/trusted/preferred/restricted): Behavior-based, enables privileges

Both systems coexist. A customer can be "Gold" (high volume) but "Restricted" (payment issues). Phase 5.2+ will check **trust tier** for eligibility while **loyalty tier** may provide additional benefits.

### Evaluation Triggers
Phase 5.1 is manual evaluation only (button click). Future phases may add:
- Automatic evaluation after order delivery
- Scheduled batch evaluation

### Score Formula Summary
```text
Base: 50
+ Completed orders: +2 per order (max +20)
+ On-time payment ratio: +25 max
- Late payments: -5 per order
- Unresolved disputes: -10 each
- Resolved disputes: -3 each
```
