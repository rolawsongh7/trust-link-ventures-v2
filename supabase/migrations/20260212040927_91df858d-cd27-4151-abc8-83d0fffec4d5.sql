
-- =============================================
-- Phase 5.4: Multi-Tenancy Tables, RLS, RPCs
-- =============================================

-- 1. TABLES
-- ---------

CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE public.tenant_workflow_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tenant_feature_eligibility (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  disabled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, feature_key)
);

-- 2. INDEXES
-- ----------

CREATE INDEX idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX idx_tenant_feature_eligibility_tenant_id ON public.tenant_feature_eligibility(tenant_id);

-- 3. TIMESTAMPS TRIGGER
-- ---------------------

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_workflow_config_updated_at
  BEFORE UPDATE ON public.tenant_workflow_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_feature_eligibility_updated_at
  BEFORE UPDATE ON public.tenant_feature_eligibility
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS
-- ------

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_workflow_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_feature_eligibility ENABLE ROW LEVEL SECURITY;

-- tenants policies
CREATE POLICY "Super admins full access on tenants"
  ON public.tenants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Tenant members can view their tenant"
  ON public.tenants FOR SELECT
  USING (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- tenant_users policies
CREATE POLICY "Super admins full access on tenant_users"
  ON public.tenant_users FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Users can view their own tenant_users row"
  ON public.tenant_users FOR SELECT
  USING (user_id = auth.uid());

-- tenant_workflow_config policies
CREATE POLICY "Super admins full access on tenant_workflow_config"
  ON public.tenant_workflow_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Tenant members can view their workflow config"
  ON public.tenant_workflow_config FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- tenant_feature_eligibility policies
CREATE POLICY "Super admins full access on tenant_feature_eligibility"
  ON public.tenant_feature_eligibility FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "Tenant members can view their feature eligibility"
  ON public.tenant_feature_eligibility FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- 5. RPC FUNCTIONS
-- ----------------

CREATE OR REPLACE FUNCTION public.get_tenant_workflow_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT config INTO v_config
  FROM public.tenant_workflow_config
  WHERE tenant_id = p_tenant_id;

  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_tenant_workflow_config(p_tenant_id UUID, p_config JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is super_admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: super_admin role required');
  END IF;

  INSERT INTO public.tenant_workflow_config (tenant_id, config)
  VALUES (p_tenant_id, p_config)
  ON CONFLICT (tenant_id)
  DO UPDATE SET config = p_config, updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_tenant_use_feature(p_tenant_id UUID, p_feature_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_reason TEXT;
BEGIN
  SELECT enabled, disabled_reason INTO v_enabled, v_reason
  FROM public.tenant_feature_eligibility
  WHERE tenant_id = p_tenant_id AND feature_key = p_feature_key;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'reason', null);
  END IF;

  RETURN jsonb_build_object('allowed', COALESCE(v_enabled, true), 'reason', v_reason);
END;
$$;
