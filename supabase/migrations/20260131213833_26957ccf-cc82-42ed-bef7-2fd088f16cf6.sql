-- =====================================================
-- Phase 3B: Controlled Financial Leverage
-- Customer Credit Terms, Benefits, Feature Flags
-- =====================================================

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

-- Indexes for performance
CREATE INDEX idx_credit_terms_customer ON public.customer_credit_terms(customer_id);
CREATE INDEX idx_credit_terms_status ON public.customer_credit_terms(status);
CREATE INDEX idx_benefits_customer ON public.customer_benefits(customer_id);
CREATE INDEX idx_benefits_type ON public.customer_benefits(benefit_type);
CREATE INDEX idx_benefits_enabled ON public.customer_benefits(enabled) WHERE enabled = true;
CREATE INDEX idx_feature_flags_key ON public.system_feature_flags(feature_key);

-- Updated_at triggers
CREATE TRIGGER update_customer_credit_terms_updated_at
  BEFORE UPDATE ON public.customer_credit_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_benefits_updated_at
  BEFORE UPDATE ON public.customer_benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_feature_flags_updated_at
  BEFORE UPDATE ON public.system_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Credit Terms: Super admin manages, admins view
ALTER TABLE public.customer_credit_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage credit terms"
  ON public.customer_credit_terms FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view credit terms"
  ON public.customer_credit_terms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Customer Benefits: Same pattern
ALTER TABLE public.customer_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage benefits"
  ON public.customer_benefits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view benefits"
  ON public.customer_benefits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Feature Flags: Super admin only manages, admins view
ALTER TABLE public.system_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage feature flags"
  ON public.system_feature_flags FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Admins can view feature flags"
  ON public.system_feature_flags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- =====================================================
-- RPC Functions (Secure Credit Operations)
-- =====================================================

-- Check Credit Eligibility
CREATE OR REPLACE FUNCTION public.check_credit_eligibility(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
  
  -- Check repeat buyer (2+ orders)
  IF COALESCE(v_loyalty_data.lifetime_orders, 0) < 2 THEN
    v_eligible := false;
    v_reasons := array_append(v_reasons, 'Needs 2+ completed orders');
  END IF;
  
  -- Check tier (must be silver or gold)
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

-- Approve Credit Terms
CREATE OR REPLACE FUNCTION public.approve_credit_terms(
  p_customer_id UUID,
  p_credit_limit NUMERIC,
  p_net_terms TEXT DEFAULT 'net_14'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_loyalty_data RECORD;
  v_has_overdue BOOLEAN;
  v_credit_enabled BOOLEAN;
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

-- Suspend Credit Terms
CREATE OR REPLACE FUNCTION public.suspend_credit_terms(
  p_customer_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Only super admins can suspend credit terms');
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
  
  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id);
END;
$$;

-- Adjust Credit Limit
CREATE OR REPLACE FUNCTION public.adjust_credit_limit(
  p_customer_id UUID,
  p_new_limit NUMERIC,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_limit NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Only super admins can adjust credit limits');
  END IF;
  
  -- Get current data
  SELECT credit_limit, current_balance INTO v_old_limit, v_current_balance
  FROM customer_credit_terms
  WHERE customer_id = p_customer_id;
  
  IF v_old_limit IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'No credit terms found for this customer');
  END IF;
  
  -- Validate new limit >= current balance
  IF p_new_limit < v_current_balance THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_limit', 'message', 'New limit cannot be less than current balance');
  END IF;
  
  -- Update limit
  UPDATE customer_credit_terms
  SET 
    credit_limit = p_new_limit,
    updated_at = now()
  WHERE customer_id = p_customer_id;
  
  -- Log audit event
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action, event_data, severity, user_id
  ) VALUES (
    'credit_terms_limit_changed', 'customer_credit_terms', p_customer_id::text,
    'adjust_limit', jsonb_build_object('old_limit', v_old_limit, 'new_limit', p_new_limit, 'reason', p_reason), 'high', auth.uid()
  );
  
  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id, 'old_limit', v_old_limit, 'new_limit', p_new_limit);
END;
$$;

-- Toggle Feature Flag (Kill Switch)
CREATE OR REPLACE FUNCTION public.toggle_feature_flag(
  p_feature_key TEXT,
  p_enabled BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_enabled BOOLEAN;
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Only super admins can toggle feature flags');
  END IF;
  
  -- Get current state
  SELECT enabled INTO v_old_enabled
  FROM system_feature_flags
  WHERE feature_key = p_feature_key;
  
  IF v_old_enabled IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found', 'message', 'Feature flag not found');
  END IF;
  
  -- Update flag
  UPDATE system_feature_flags
  SET 
    enabled = p_enabled,
    disabled_by = CASE WHEN NOT p_enabled THEN auth.uid() ELSE NULL END,
    disabled_at = CASE WHEN NOT p_enabled THEN now() ELSE NULL END,
    disabled_reason = CASE WHEN NOT p_enabled THEN p_reason ELSE NULL END,
    updated_at = now()
  WHERE feature_key = p_feature_key;
  
  -- Log audit event
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action, event_data, severity, user_id
  ) VALUES (
    'feature_flag_changed', 'system_feature_flags', p_feature_key,
    CASE WHEN p_enabled THEN 'enable' ELSE 'disable' END,
    jsonb_build_object('old_enabled', v_old_enabled, 'new_enabled', p_enabled, 'reason', p_reason),
    'high', auth.uid()
  );
  
  RETURN jsonb_build_object('success', true, 'feature_key', p_feature_key, 'enabled', p_enabled);
END;
$$;

-- Toggle Customer Benefit
CREATE OR REPLACE FUNCTION public.toggle_customer_benefit(
  p_customer_id UUID,
  p_benefit_type TEXT,
  p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_benefits_enabled BOOLEAN;
BEGIN
  -- Verify super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized', 'message', 'Only super admins can toggle customer benefits');
  END IF;
  
  -- Check global kill switch
  SELECT enabled INTO v_benefits_enabled
  FROM system_feature_flags
  WHERE feature_key = 'loyalty_benefits_global';
  
  IF NOT COALESCE(v_benefits_enabled, true) AND p_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'feature_disabled', 'message', 'Loyalty benefits are globally disabled');
  END IF;
  
  -- Validate benefit type
  IF p_benefit_type NOT IN ('priority_processing', 'dedicated_manager', 'faster_sla') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_type', 'message', 'Invalid benefit type');
  END IF;
  
  -- Upsert benefit
  INSERT INTO customer_benefits (
    customer_id,
    benefit_type,
    enabled,
    enabled_by,
    enabled_at,
    disabled_at
  ) VALUES (
    p_customer_id,
    p_benefit_type,
    p_enabled,
    CASE WHEN p_enabled THEN auth.uid() ELSE NULL END,
    CASE WHEN p_enabled THEN now() ELSE NULL END,
    CASE WHEN NOT p_enabled THEN now() ELSE NULL END
  )
  ON CONFLICT (customer_id, benefit_type) DO UPDATE SET
    enabled = p_enabled,
    enabled_by = CASE WHEN p_enabled THEN auth.uid() ELSE customer_benefits.enabled_by END,
    enabled_at = CASE WHEN p_enabled THEN now() ELSE customer_benefits.enabled_at END,
    disabled_at = CASE WHEN NOT p_enabled THEN now() ELSE NULL END,
    updated_at = now();
  
  -- Log audit event
  INSERT INTO audit_logs (
    event_type, resource_type, resource_id, action, event_data, severity, user_id
  ) VALUES (
    CASE WHEN p_enabled THEN 'benefit_enabled' ELSE 'benefit_disabled' END,
    'customer_benefits', p_customer_id::text,
    CASE WHEN p_enabled THEN 'enable' ELSE 'disable' END,
    jsonb_build_object('benefit_type', p_benefit_type, 'enabled', p_enabled),
    'high', auth.uid()
  );
  
  RETURN jsonb_build_object('success', true, 'customer_id', p_customer_id, 'benefit_type', p_benefit_type, 'enabled', p_enabled);
END;
$$;