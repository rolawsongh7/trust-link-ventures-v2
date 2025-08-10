-- Create tables for password protection, compliance, and network security

-- Password history table
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  strength_score INTEGER NOT NULL CHECK (strength_score BETWEEN 1 AND 3),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Privacy settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Consent history table
CREATE TABLE IF NOT EXISTS public.consent_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consent_data JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Account deletions table
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deletion_reason TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Network security settings table
CREATE TABLE IF NOT EXISTS public.network_security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  block_vpn BOOLEAN NOT NULL DEFAULT false,
  block_tor BOOLEAN NOT NULL DEFAULT true,
  enable_geo_blocking BOOLEAN NOT NULL DEFAULT false,
  risk_threshold INTEGER NOT NULL DEFAULT 7 CHECK (risk_threshold BETWEEN 1 AND 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_history
CREATE POLICY "Users can view their own password history" ON public.password_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert password history" ON public.password_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for privacy_settings
CREATE POLICY "Users can manage their own privacy settings" ON public.privacy_settings
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for consent_history
CREATE POLICY "Users can view their own consent history" ON public.consent_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consent history" ON public.consent_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for account_deletions
CREATE POLICY "Users can manage their own account deletions" ON public.account_deletions
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all account deletions" ON public.account_deletions
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for network_security_settings
CREATE POLICY "Users can manage their own network security settings" ON public.network_security_settings
  FOR ALL USING (user_id = auth.uid());

-- Create triggers for updated_at columns
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON public.privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_network_security_settings_updated_at
  BEFORE UPDATE ON public.network_security_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();