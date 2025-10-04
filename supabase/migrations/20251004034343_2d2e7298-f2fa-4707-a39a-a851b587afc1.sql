-- Create enum for assistant modes
CREATE TYPE assistant_mode AS ENUM ('qa', 'workflow');

-- Create enum for responsibility status
CREATE TYPE responsibility_status AS ENUM ('active', 'inactive', 'running', 'completed', 'failed');

-- Virtual Assistant Settings Table
CREATE TABLE public.virtual_assistant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  current_mode assistant_mode NOT NULL DEFAULT 'qa',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Virtual Assistant Responsibilities Table
CREATE TABLE public.virtual_assistant_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode assistant_mode NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  status responsibility_status NOT NULL DEFAULT 'inactive',
  last_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mode, name)
);

-- Virtual Assistant Logs Table
CREATE TABLE public.virtual_assistant_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsibility_id UUID REFERENCES public.virtual_assistant_responsibilities(id) ON DELETE CASCADE,
  mode assistant_mode NOT NULL,
  responsibility_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Virtual Assistant Reports Table
CREATE TABLE public.virtual_assistant_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode assistant_mode NOT NULL,
  report_type TEXT NOT NULL,
  summary TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_assistant_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_assistant_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_assistant_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage assistant settings"
  ON public.virtual_assistant_settings
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage responsibilities"
  ON public.virtual_assistant_responsibilities
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view logs"
  ON public.virtual_assistant_logs
  FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
  ON public.virtual_assistant_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view reports"
  ON public.virtual_assistant_reports
  FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert reports"
  ON public.virtual_assistant_reports
  FOR INSERT
  WITH CHECK (true);

-- Insert default settings
INSERT INTO public.virtual_assistant_settings (is_enabled, current_mode) VALUES (false, 'qa');

-- Insert QA Mode Responsibilities
INSERT INTO public.virtual_assistant_responsibilities (mode, name, description, is_enabled) VALUES
  ('qa', 'authentication_testing', 'Test admin, customer, MFA, and session persistence', false),
  ('qa', 'customer_portal_validation', 'Validate catalog, RFQ, cart, quote, and order tracking', false),
  ('qa', 'admin_crm_checks', 'Check leads, quotes, orders, RFQs, and analytics', false),
  ('qa', 'supplier_integration_checks', 'Validate product imports and catalog sync', false),
  ('qa', 'document_generation_validation', 'Test PDF, title, and logo generation', false),
  ('qa', 'email_notification_testing', 'Test email and notification delivery', false),
  ('qa', 'security_validation', 'Test RLS, access control, and security vulnerabilities', false),
  ('qa', 'performance_monitoring', 'Monitor page load, database queries, and lazy loading', false),
  ('qa', 'cross_device_testing', 'Test across different devices and browsers', false),
  ('qa', 'deployment_smoke_tests', 'Run smoke tests and data validation after deployment', false);

-- Insert Workflow Mode Responsibilities
INSERT INTO public.virtual_assistant_responsibilities (mode, name, description, is_enabled) VALUES
  ('workflow', 'auto_convert_quotes', 'Automatically convert accepted quotes into orders', false),
  ('workflow', 'rfq_automation', 'Generate, distribute, collect, and summarize RFQs', false),
  ('workflow', 'customer_interaction_automation', 'Automate emails, confirmations, and follow-ups', false),
  ('workflow', 'crm_automation', 'Automate lead updates, assignments, and daily digest', false),
  ('workflow', 'document_automation', 'Auto-generate PDFs, organize, and retrieve documents', false),
  ('workflow', 'notifications_reminders', 'Send quote expiry, RFQ deadlines, and cart reminders', false),
  ('workflow', 'analytics_insights', 'Generate conversion rates, supplier performance, and optimization tips', false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_virtual_assistant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_assistant_settings_timestamp
  BEFORE UPDATE ON public.virtual_assistant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_assistant_updated_at();

CREATE TRIGGER update_assistant_responsibilities_timestamp
  BEFORE UPDATE ON public.virtual_assistant_responsibilities
  FOR EACH ROW
  EXECUTE FUNCTION update_virtual_assistant_updated_at();