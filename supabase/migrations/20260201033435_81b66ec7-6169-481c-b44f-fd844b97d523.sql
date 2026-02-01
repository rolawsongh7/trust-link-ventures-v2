-- Phase 5.1: Customer Trust & Tiering
-- Establishes behavioral trust system for eligibility unlocking (read-only impact)

-- 1. Create trust tier enum
CREATE TYPE public.customer_trust_tier AS ENUM (
  'new',        -- No history
  'verified',   -- Paid at least once on time
  'trusted',    -- Consistent, on-time payments
  'preferred',  -- High volume, low risk
  'restricted'  -- Late payments or disputes
);

-- 2. Create customer_trust_profiles table
CREATE TABLE public.customer_trust_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  trust_tier public.customer_trust_tier NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  
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
CREATE INDEX idx_trust_profiles_customer ON public.customer_trust_profiles(customer_id);
CREATE INDEX idx_trust_profiles_tier ON public.customer_trust_profiles(trust_tier);
CREATE INDEX idx_trust_profiles_score ON public.customer_trust_profiles(score);

-- 3. Create customer_trust_history table (audit trail)
CREATE TABLE public.customer_trust_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  previous_tier public.customer_trust_tier,
  new_tier public.customer_trust_tier NOT NULL,
  previous_score INTEGER,
  new_score INTEGER NOT NULL,
  change_reason TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id), -- NULL for system
  is_manual_override BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_trust_history_customer ON public.customer_trust_history(customer_id);
CREATE INDEX idx_trust_history_created ON public.customer_trust_history(created_at DESC);

-- 4. Enable RLS
ALTER TABLE public.customer_trust_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_trust_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for customer_trust_profiles

-- Staff can read all trust profiles
CREATE POLICY "Staff can read trust profiles"
ON public.customer_trust_profiles FOR SELECT
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'admin') OR
  public.check_user_role(auth.uid(), 'super_admin') OR
  public.check_user_role(auth.uid(), 'sales_rep')
);

-- Super admin can insert/update trust profiles
CREATE POLICY "Super admin can insert trust profiles"
ON public.customer_trust_profiles FOR INSERT
TO authenticated
WITH CHECK (public.check_user_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin can update trust profiles"
ON public.customer_trust_profiles FOR UPDATE
TO authenticated
USING (public.check_user_role(auth.uid(), 'super_admin'))
WITH CHECK (public.check_user_role(auth.uid(), 'super_admin'));

-- Customers can read their own trust tier
CREATE POLICY "Customers can read own trust profile"
ON public.customer_trust_profiles FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT cu.customer_id FROM public.customer_users cu WHERE cu.user_id = auth.uid()
  )
);

-- 6. RLS Policies for customer_trust_history

-- Staff can read trust history
CREATE POLICY "Staff can read trust history"
ON public.customer_trust_history FOR SELECT
TO authenticated
USING (
  public.check_user_role(auth.uid(), 'admin') OR
  public.check_user_role(auth.uid(), 'super_admin')
);

-- Super admin can insert trust history (via RPC)
CREATE POLICY "Super admin can insert trust history"
ON public.customer_trust_history FOR INSERT
TO authenticated
WITH CHECK (public.check_user_role(auth.uid(), 'super_admin'));

-- 7. Trust Evaluation Function (Server-Side RPC)
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
  v_unresolved_disputes INTEGER;
  v_resolved_disputes INTEGER;
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
      'unresolved_disputes', v_unresolved_disputes,
      'resolved_disputes', v_resolved_disputes
    )
  );
END;
$$;

-- 8. Manual Override Function (Super Admin Only)
CREATE OR REPLACE FUNCTION public.override_customer_trust(
  p_customer_id UUID,
  p_new_tier public.customer_trust_tier,
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
  v_new_score INTEGER;
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

  -- Calculate new score based on tier
  v_new_score := CASE p_new_tier 
    WHEN 'preferred' THEN 90
    WHEN 'trusted' THEN 75
    WHEN 'verified' THEN 60
    WHEN 'new' THEN 50
    WHEN 'restricted' THEN 20
  END;

  -- Upsert with override
  INSERT INTO customer_trust_profiles (
    customer_id, trust_tier, score, manual_override, 
    override_reason, override_by, override_at, last_evaluated_at
  ) VALUES (
    p_customer_id, p_new_tier, v_new_score,
    true, p_reason, v_caller_id, now(), now()
  )
  ON CONFLICT (customer_id) DO UPDATE SET
    trust_tier = p_new_tier,
    score = v_new_score,
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
    v_existing_score, v_new_score,
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

-- 9. Clear Manual Override Function
CREATE OR REPLACE FUNCTION public.clear_customer_trust_override(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_is_super_admin BOOLEAN;
BEGIN
  -- Verify super admin access
  SELECT public.check_user_role(v_caller_id, 'super_admin') INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'unauthorized',
      'message', 'Only super admins can clear trust overrides'
    );
  END IF;

  -- Clear override flag
  UPDATE customer_trust_profiles
  SET 
    manual_override = false,
    override_reason = NULL,
    override_by = NULL,
    override_at = NULL,
    updated_at = now()
  WHERE customer_id = p_customer_id;

  -- Log the action
  INSERT INTO audit_logs (
    user_id, event_type, action, resource_type, resource_id,
    severity, event_data
  ) VALUES (
    v_caller_id, 'settings_changed', 'trust_override_cleared', 'customer', p_customer_id::text,
    'medium', jsonb_build_object('customer_id', p_customer_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'customer_id', p_customer_id,
    'message', 'Override cleared, automatic evaluation will apply on next run'
  );
END;
$$;