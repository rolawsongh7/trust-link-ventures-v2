-- Enhanced Audit Logging System

-- Add additional columns to audit_logs for better tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changes JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);

-- Create system events log for application-level events
CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_events
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_events
CREATE POLICY "Admins can view all system events"
  ON public.system_events
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can insert events"
  ON public.system_events
  FOR INSERT
  WITH CHECK (true);

-- Create security alerts tracking
CREATE TABLE IF NOT EXISTS public.security_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_pattern TEXT NOT NULL,
  severity_threshold TEXT NOT NULL DEFAULT 'medium',
  notification_channels JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on security_alert_rules
ALTER TABLE public.security_alert_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_alert_rules
CREATE POLICY "Admins can manage alert rules"
  ON public.security_alert_rules
  FOR ALL
  USING (get_user_role(auth.uid()) = 'admin');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_events_type_time ON public.system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_severity ON public.system_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON public.security_alert_rules(is_active) WHERE is_active = true;

-- Function to get audit log summary
CREATE OR REPLACE FUNCTION public.get_audit_summary(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  event_type TEXT,
  count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.event_type,
    COUNT(*)::BIGINT as count,
    MAX(a.created_at) as last_occurrence
  FROM audit_logs a
  WHERE 
    (p_user_id IS NULL OR a.user_id = p_user_id)
    AND a.created_at >= now() - (p_days || ' days')::interval
  GROUP BY a.event_type
  ORDER BY count DESC;
END;
$$;

-- Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  p_user_id UUID,
  p_time_window INTEGER DEFAULT 15
)
RETURNS TABLE(
  pattern_type TEXT,
  occurrences BIGINT,
  risk_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recent_events AS (
    SELECT event_type, severity, created_at
    FROM audit_logs
    WHERE user_id = p_user_id
    AND created_at >= now() - (p_time_window || ' minutes')::interval
  )
  SELECT 
    'rapid_failed_logins'::TEXT as pattern_type,
    COUNT(*)::BIGINT as occurrences,
    CASE 
      WHEN COUNT(*) >= 5 THEN 'high'
      WHEN COUNT(*) >= 3 THEN 'medium'
      ELSE 'low'
    END::TEXT as risk_level
  FROM recent_events
  WHERE event_type = 'failed_login'
  
  UNION ALL
  
  SELECT 
    'high_severity_events'::TEXT,
    COUNT(*)::BIGINT,
    CASE 
      WHEN COUNT(*) >= 3 THEN 'high'
      WHEN COUNT(*) >= 2 THEN 'medium'
      ELSE 'low'
    END::TEXT
  FROM recent_events
  WHERE severity = 'high';
END;
$$;

-- Function to create audit log with validation
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_user_id UUID,
  p_event_type TEXT,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}',
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'low'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('low', 'medium', 'high') THEN
    RAISE EXCEPTION 'Invalid severity level: %', p_severity;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    event_data,
    changes,
    ip_address,
    user_agent,
    severity
  ) VALUES (
    p_user_id,
    p_event_type,
    p_action,
    p_resource_type,
    p_resource_id,
    p_event_data,
    p_changes,
    p_ip_address,
    p_user_agent,
    p_severity
  ) RETURNING id INTO v_log_id;

  -- Check for suspicious patterns if it's a security-related event
  IF p_event_type IN ('failed_login', 'mfa_failed', 'unauthorized_access') THEN
    PERFORM detect_suspicious_activity(p_user_id, 15);
  END IF;

  RETURN v_log_id;
END;
$$;