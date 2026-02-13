
-- Add domain columns to tenants table for multi-tenant domain routing
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS domain TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS admin_domain TEXT UNIQUE;

-- Indexes for fast hostname lookups
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON public.tenants(domain);
CREATE INDEX IF NOT EXISTS idx_tenants_admin_domain ON public.tenants(admin_domain);

-- Backfill Tenant 1 with corrected domains
UPDATE public.tenants
SET domain = 'trustlinkcompany.com',
    admin_domain = 'admin.trustlinkcompany.com'
WHERE slug = 'trustlink-demo';
