-- Create missing tables for advanced security features

-- User login history table
CREATE TABLE IF NOT EXISTS public.user_login_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location_data JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL DEFAULT true,
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Security events table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Device fingerprints table
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fingerprint_hash TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User MFA settings table
CREATE TABLE IF NOT EXISTS public.user_mfa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  secret_key TEXT,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User data exports table
CREATE TABLE IF NOT EXISTS public.user_data_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  export_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Password policies table
CREATE TABLE IF NOT EXISTS public.password_policies (
  id INTEGER PRIMARY KEY DEFAULT 1,
  min_length INTEGER NOT NULL DEFAULT 8,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_numbers BOOLEAN NOT NULL DEFAULT true,
  require_special_chars BOOLEAN NOT NULL DEFAULT true,
  max_age_days INTEGER,
  prevent_reuse_count INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Failed login attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User locations table
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  country_name TEXT,
  city TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- IP whitelist table
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own login history" ON public.user_login_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own login history" ON public.user_login_history FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own security events" ON public.security_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own security events" ON public.security_events FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own device fingerprints" ON public.device_fingerprints FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own MFA settings" ON public.user_mfa_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own sessions" ON public.user_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own data exports" ON public.user_data_exports FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Anyone can read password policies" ON public.password_policies FOR SELECT USING (true);
CREATE POLICY "Admins can manage password policies" ON public.password_policies FOR ALL USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can view failed attempts for their email" ON public.failed_login_attempts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert failed login attempts" ON public.failed_login_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own locations" ON public.user_locations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own locations" ON public.user_locations FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own IP whitelist" ON public.ip_whitelist FOR ALL USING (user_id = auth.uid());

-- Add triggers for updated_at columns
CREATE TRIGGER update_user_mfa_settings_updated_at BEFORE UPDATE ON public.user_mfa_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON public.user_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_password_policies_updated_at BEFORE UPDATE ON public.password_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ip_whitelist_updated_at BEFORE UPDATE ON public.ip_whitelist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default password policy
INSERT INTO public.password_policies (id) VALUES (1) ON CONFLICT DO NOTHING;