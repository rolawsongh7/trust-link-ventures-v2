-- Create security-related tables for the security dashboard and file upload components

-- Security alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CSP violations table
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  document_uri TEXT,
  violated_directive TEXT,
  blocked_uri TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- File uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  file_hash TEXT,
  storage_path TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validated', 'rejected')),
  validation_errors TEXT[],
  virus_scan_status TEXT DEFAULT 'pending' CHECK (virus_scan_status IN ('pending', 'clean', 'infected')),
  upload_ip INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rate limiting tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_alerts
CREATE POLICY "Users can view their own security alerts" ON public.security_alerts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all security alerts" ON public.security_alerts FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "System can insert security alerts" ON public.security_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own security alerts" ON public.security_alerts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can update all security alerts" ON public.security_alerts FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Create RLS policies for csp_violations
CREATE POLICY "Admins can view all CSP violations" ON public.csp_violations FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "System can insert CSP violations" ON public.csp_violations FOR INSERT WITH CHECK (true);

-- Create RLS policies for file_uploads
CREATE POLICY "Users can view their own file uploads" ON public.file_uploads FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all file uploads" ON public.file_uploads FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can insert their own file uploads" ON public.file_uploads FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own file uploads" ON public.file_uploads FOR UPDATE USING (user_id = auth.uid());

-- Create RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- Create RLS policies for rate_limit_attempts
CREATE POLICY "System can manage rate limit attempts" ON public.rate_limit_attempts FOR ALL USING (true);

-- Add triggers for updated_at columns
CREATE TRIGGER update_security_alerts_updated_at BEFORE UPDATE ON public.security_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON public.file_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX idx_security_alerts_status ON public.security_alerts(status);
CREATE INDEX idx_security_alerts_created_at ON public.security_alerts(created_at);

CREATE INDEX idx_csp_violations_created_at ON public.csp_violations(created_at);
CREATE INDEX idx_csp_violations_user_id ON public.csp_violations(user_id);

CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_validation_status ON public.file_uploads(validation_status);
CREATE INDEX idx_file_uploads_created_at ON public.file_uploads(created_at);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

CREATE INDEX idx_rate_limit_attempts_identifier ON public.rate_limit_attempts(identifier);
CREATE INDEX idx_rate_limit_attempts_window_start ON public.rate_limit_attempts(window_start);