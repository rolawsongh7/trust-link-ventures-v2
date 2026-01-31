-- ============================================
-- Phase 4.1: Automation Foundations
-- Safe, Deterministic, Reversible Engine
-- ============================================

-- ============================================
-- Table 1: automation_settings (singleton)
-- Global control plane for automation
-- ============================================
CREATE TABLE public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_enabled BOOLEAN NOT NULL DEFAULT false,
  max_executions_per_minute INTEGER NOT NULL DEFAULT 30,
  auto_disable_threshold INTEGER NOT NULL DEFAULT 3,
  auto_disable_window_minutes INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert singleton row
INSERT INTO public.automation_settings (id) VALUES (gen_random_uuid());

-- Constraint to ensure only one row exists
CREATE UNIQUE INDEX automation_settings_singleton ON public.automation_settings ((true));

-- Enable RLS
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Super admin full access, admin read-only
CREATE POLICY "Super admins can manage automation settings"
  ON public.automation_settings
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view automation settings"
  ON public.automation_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_super_admin(auth.uid()));

-- ============================================
-- Table 2: automation_rules
-- Defines what automations can run
-- ============================================
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'customer', 'payment', 'quote')),
  trigger_event TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  enabled BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  failure_count INTEGER NOT NULL DEFAULT 0,
  auto_disabled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_automation_rules_enabled ON public.automation_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_automation_rules_trigger ON public.automation_rules(trigger_event, entity_type);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS: Super admin full access, admin read-only
CREATE POLICY "Super admins can manage automation rules"
  ON public.automation_rules
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view automation rules"
  ON public.automation_rules
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_super_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table 3: automation_executions
-- Immutable execution log
-- ============================================
CREATE TABLE public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
  result JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for querying execution history
CREATE INDEX idx_automation_executions_rule ON public.automation_executions(rule_id);
CREATE INDEX idx_automation_executions_executed_at ON public.automation_executions(executed_at DESC);
CREATE INDEX idx_automation_executions_status ON public.automation_executions(status);

-- Enable RLS
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;

-- RLS: Super admin full access, admin read-only
CREATE POLICY "Super admins can manage automation executions"
  ON public.automation_executions
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can view automation executions"
  ON public.automation_executions
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_super_admin(auth.uid()));

-- ============================================
-- RPC Function: is_automation_enabled()
-- Check if global automation is enabled
-- ============================================
CREATE OR REPLACE FUNCTION public.is_automation_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT automation_enabled FROM public.automation_settings LIMIT 1),
    false
  );
$$;

-- ============================================
-- RPC Function: is_rule_enabled(p_rule_id)
-- Check if specific rule is enabled AND global is enabled
-- ============================================
CREATE OR REPLACE FUNCTION public.is_rule_enabled(p_rule_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_automation_enabled() 
    AND COALESCE(
      (SELECT enabled AND auto_disabled_at IS NULL FROM public.automation_rules WHERE id = p_rule_id),
      false
    );
$$;

-- ============================================
-- RPC Function: toggle_automation_global
-- Super admin only - toggles global automation
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_automation_global(
  p_enabled BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_enabled BOOLEAN;
  v_event_type TEXT;
BEGIN
  -- Guard: Require super_admin
  IF NOT public.is_super_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: super_admin role required');
  END IF;

  -- Get current state
  SELECT automation_enabled INTO v_old_enabled FROM public.automation_settings LIMIT 1;

  -- Update settings
  UPDATE public.automation_settings
  SET 
    automation_enabled = p_enabled,
    updated_at = now(),
    updated_by = v_user_id
  WHERE true;

  -- Determine event type
  v_event_type := CASE WHEN p_enabled THEN 'automation_global_enabled' ELSE 'automation_global_disabled' END;

  -- Log to audit
  INSERT INTO public.audit_logs (
    user_id,
    event_type,
    action,
    severity,
    event_data
  ) VALUES (
    v_user_id,
    v_event_type,
    'Toggle global automation',
    'high',
    jsonb_build_object(
      'old_enabled', v_old_enabled,
      'new_enabled', p_enabled,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'enabled', p_enabled
  );
END;
$$;

-- ============================================
-- RPC Function: toggle_automation_rule
-- Super admin only - toggles specific rule
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_automation_rule(
  p_rule_id UUID,
  p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rule RECORD;
  v_event_type TEXT;
BEGIN
  -- Guard: Require super_admin
  IF NOT public.is_super_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: super_admin role required');
  END IF;

  -- Get current rule state
  SELECT * INTO v_rule FROM public.automation_rules WHERE id = p_rule_id;
  
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule not found');
  END IF;

  -- Update rule
  UPDATE public.automation_rules
  SET 
    enabled = p_enabled,
    auto_disabled_at = CASE WHEN p_enabled THEN NULL ELSE auto_disabled_at END,
    failure_count = CASE WHEN p_enabled THEN 0 ELSE failure_count END,
    updated_at = now()
  WHERE id = p_rule_id;

  -- Determine event type
  v_event_type := CASE WHEN p_enabled THEN 'automation_rule_enabled' ELSE 'automation_rule_disabled' END;

  -- Log to audit
  INSERT INTO public.audit_logs (
    user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    severity,
    event_data
  ) VALUES (
    v_user_id,
    v_event_type,
    'Toggle automation rule',
    'automation_rule',
    p_rule_id::TEXT,
    'high',
    jsonb_build_object(
      'rule_name', v_rule.name,
      'old_enabled', v_rule.enabled,
      'new_enabled', p_enabled
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', p_rule_id,
    'enabled', p_enabled
  );
END;
$$;

-- ============================================
-- RPC Function: log_automation_execution
-- Logs execution and handles auto-disable
-- ============================================
CREATE OR REPLACE FUNCTION public.log_automation_execution(
  p_rule_id UUID,
  p_entity_id UUID,
  p_entity_type TEXT,
  p_trigger_event TEXT,
  p_status TEXT,
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id UUID;
  v_rule RECORD;
  v_settings RECORD;
  v_recent_failures INTEGER;
  v_should_auto_disable BOOLEAN := false;
BEGIN
  -- Insert execution log
  INSERT INTO public.automation_executions (
    rule_id,
    entity_id,
    entity_type,
    trigger_event,
    status,
    result,
    error_message,
    duration_ms
  ) VALUES (
    p_rule_id,
    p_entity_id,
    p_entity_type,
    p_trigger_event,
    p_status,
    p_result,
    p_error_message,
    p_duration_ms
  ) RETURNING id INTO v_execution_id;

  -- If failed, check for auto-disable
  IF p_status = 'failed' THEN
    -- Increment failure count
    UPDATE public.automation_rules
    SET failure_count = failure_count + 1
    WHERE id = p_rule_id
    RETURNING * INTO v_rule;

    -- Get settings
    SELECT * INTO v_settings FROM public.automation_settings LIMIT 1;

    -- Count recent failures in window
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.automation_executions
    WHERE rule_id = p_rule_id
      AND status = 'failed'
      AND executed_at > now() - (v_settings.auto_disable_window_minutes || ' minutes')::INTERVAL;

    -- Auto-disable if threshold exceeded
    IF v_recent_failures >= v_settings.auto_disable_threshold THEN
      v_should_auto_disable := true;
      
      UPDATE public.automation_rules
      SET 
        enabled = false,
        auto_disabled_at = now()
      WHERE id = p_rule_id;

      -- Log auto-disable event
      INSERT INTO public.audit_logs (
        event_type,
        action,
        resource_type,
        resource_id,
        severity,
        event_data
      ) VALUES (
        'automation_rule_auto_disabled',
        'Auto-disabled due to failures',
        'automation_rule',
        p_rule_id::TEXT,
        'high',
        jsonb_build_object(
          'rule_name', v_rule.name,
          'failure_count', v_recent_failures,
          'threshold', v_settings.auto_disable_threshold,
          'window_minutes', v_settings.auto_disable_window_minutes
        )
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'execution_id', v_execution_id,
    'auto_disabled', v_should_auto_disable
  );
END;
$$;

-- ============================================
-- RPC Function: reset_rule_failure_count
-- Super admin only - resets failure count
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_rule_failure_count(p_rule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_rule RECORD;
BEGIN
  -- Guard: Require super_admin
  IF NOT public.is_super_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: super_admin role required');
  END IF;

  -- Get current rule state
  SELECT * INTO v_rule FROM public.automation_rules WHERE id = p_rule_id;
  
  IF v_rule IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rule not found');
  END IF;

  -- Reset failure count and auto_disabled_at
  UPDATE public.automation_rules
  SET 
    failure_count = 0,
    auto_disabled_at = NULL,
    updated_at = now()
  WHERE id = p_rule_id;

  -- Log to audit
  INSERT INTO public.audit_logs (
    user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    severity,
    event_data
  ) VALUES (
    v_user_id,
    'automation_failure_reset',
    'Reset automation rule failures',
    'automation_rule',
    p_rule_id::TEXT,
    'high',
    jsonb_build_object(
      'rule_name', v_rule.name,
      'old_failure_count', v_rule.failure_count,
      'was_auto_disabled', v_rule.auto_disabled_at IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', p_rule_id
  );
END;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.is_automation_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_rule_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_automation_global(BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_automation_rule(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_automation_execution(UUID, UUID, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_rule_failure_count(UUID) TO authenticated;