-- Create backup codes tracking table
CREATE TABLE IF NOT EXISTS public.user_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, code_hash)
);

-- Create MFA login attempts table for rate limiting
CREATE TABLE IF NOT EXISTS public.mfa_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  success BOOLEAN NOT NULL DEFAULT false,
  ip_address INET,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trusted devices table
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  last_used TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.user_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_backup_codes
CREATE POLICY "Users can manage their own backup codes"
  ON public.user_backup_codes
  FOR ALL
  USING (auth.uid() = user_id);

-- RLS Policies for mfa_login_attempts
CREATE POLICY "Users can view their own MFA attempts"
  ON public.mfa_login_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert MFA attempts"
  ON public.mfa_login_attempts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for trusted_devices
CREATE POLICY "Users can manage their own trusted devices"
  ON public.trusted_devices
  FOR ALL
  USING (auth.uid() = user_id);

-- Create indexes for performance (without immutable function predicates)
CREATE INDEX idx_backup_codes_user_id ON public.user_backup_codes(user_id);
CREATE INDEX idx_backup_codes_used ON public.user_backup_codes(user_id, used_at);
CREATE INDEX idx_mfa_attempts_user_time ON public.mfa_login_attempts(user_id, attempt_time);
CREATE INDEX idx_trusted_devices_user ON public.trusted_devices(user_id, device_fingerprint);
CREATE INDEX idx_trusted_devices_expires ON public.trusted_devices(expires_at);

-- Function to clean up expired trusted devices
CREATE OR REPLACE FUNCTION public.cleanup_expired_devices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM trusted_devices 
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;