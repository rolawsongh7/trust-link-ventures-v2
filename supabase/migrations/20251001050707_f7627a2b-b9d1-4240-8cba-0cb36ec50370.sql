-- Anomaly Detection Settings Table
CREATE TABLE IF NOT EXISTS public.anomaly_detection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  enable_login_pattern_detection BOOLEAN NOT NULL DEFAULT true,
  enable_velocity_checks BOOLEAN NOT NULL DEFAULT true,
  enable_location_analysis BOOLEAN NOT NULL DEFAULT true,
  enable_device_fingerprint_checks BOOLEAN NOT NULL DEFAULT true,
  sensitivity_level TEXT NOT NULL DEFAULT 'medium' CHECK (sensitivity_level IN ('low', 'medium', 'high')),
  auto_block_threshold INTEGER NOT NULL DEFAULT 70 CHECK (auto_block_threshold >= 0 AND auto_block_threshold <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.anomaly_detection_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own anomaly detection settings"
  ON public.anomaly_detection_settings
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_anomaly_settings_user ON public.anomaly_detection_settings(user_id);

-- Function to get anomaly statistics
CREATE OR REPLACE FUNCTION public.get_anomaly_statistics(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE(
  total_logins BIGINT,
  anomalous_logins BIGINT,
  average_risk_score NUMERIC,
  blocked_attempts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_logins,
    COUNT(*) FILTER (WHERE risk_score >= 50)::BIGINT as anomalous_logins,
    ROUND(AVG(risk_score), 2) as average_risk_score,
    COUNT(*) FILTER (WHERE risk_score >= 70 AND NOT success)::BIGINT as blocked_attempts
  FROM user_login_history
  WHERE 
    user_id = p_user_id
    AND login_time >= now() - (p_days || ' days')::interval;
END;
$$;