
-- Phase 6.1: Tenant Core Infrastructure (Non-Breaking Migration)
-- Adds tenant_id to all business tables, backfills, enforces constraints,
-- creates tenant resolution function, and adds RESTRICTIVE RLS policies.

-- Step 1: Create tenant resolution function
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Step 2: Add tenant_id to all business tables, backfill, enforce constraints
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'customers', 'orders', 'quotes', 'invoices', 'leads', 'products',
    'communications', 'payment_records', 'order_items', 'order_status_history',
    'quote_items', 'quote_request_items', 'quote_requests', 'quote_submissions',
    'quote_revisions', 'quote_approvals', 'quote_status_history', 'invoice_items',
    'standing_orders', 'standing_order_items', 'standing_order_generations',
    'audit_logs', 'activities', 'notifications', 'email_logs', 'file_uploads',
    'payment_transactions', 'delivery_history', 'cart_items', 'customer_favorites',
    'customer_trust_profiles', 'customer_trust_history', 'customer_credit_terms',
    'customer_credit_ledger', 'customer_loyalty', 'customer_benefits',
    'customer_addresses', 'customer_users', 'opportunities', 'pipeline_stages', 'rfqs'
  ];
  tenant1_id uuid := 'e63a2137-261f-4a63-b805-041cd97ff7a4';
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    BEGIN
      -- Add column if not exists
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID', t);
      END IF;

      -- Backfill existing rows with Tenant 1
      EXECUTE format('UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL', t) USING tenant1_id;

      -- Enforce NOT NULL
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);

      -- Set default to auto-fill on inserts
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT get_current_tenant_id()', t);

      -- Add FK constraint
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = t || '_tenant_fk'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE',
          t, t || '_tenant_fk'
        );
      END IF;

      -- Add index for performance
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', 'idx_' || t || '_tenant_id', t);

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping table % due to error: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Backfill all existing users into tenant_users as members
INSERT INTO tenant_users (tenant_id, user_id, role)
SELECT 'e63a2137-261f-4a63-b805-041cd97ff7a4'::uuid, u.id, 'member'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_users tu WHERE tu.user_id = u.id
);

-- Step 4: Add RESTRICTIVE tenant isolation policies
-- RESTRICTIVE policies are AND'd with existing permissive policies,
-- preserving all current access patterns while enforcing tenant boundaries.
DO $$
DECLARE
  t text;
  -- Tables where only authenticated users insert (standard isolation)
  standard_tables text[] := ARRAY[
    'customers', 'orders', 'quotes', 'invoices', 'leads', 'products',
    'communications', 'payment_records', 'order_items',
    'quote_items', 'quote_revisions', 'invoice_items',
    'standing_orders', 'standing_order_items', 'standing_order_generations',
    'activities', 'email_logs', 'file_uploads', 'payment_transactions',
    'delivery_history', 'cart_items', 'customer_favorites',
    'customer_trust_profiles', 'customer_trust_history', 'customer_credit_terms',
    'customer_credit_ledger', 'customer_loyalty', 'customer_benefits',
    'customer_addresses', 'customer_users', 'opportunities', 'pipeline_stages', 'rfqs'
  ];
  -- Tables that allow unauthenticated/system inserts (relaxed WITH CHECK)
  public_insert_tables text[] := ARRAY[
    'quote_requests', 'quote_request_items', 'quote_approvals', 'quote_submissions',
    'audit_logs', 'order_status_history', 'quote_status_history', 'notifications'
  ];
BEGIN
  -- Enable RLS on all tables (idempotent)
  FOREACH t IN ARRAY standard_tables || public_insert_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'RLS enable skipped for %: %', t, SQLERRM;
    END;
  END LOOP;

  -- Standard tenant isolation: both USING and WITH CHECK require tenant match
  FOREACH t IN ARRAY standard_tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I AS RESTRICTIVE FOR ALL '
        || 'USING (tenant_id = get_current_tenant_id() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''super_admin''::user_role)) '
        || 'WITH CHECK (tenant_id = get_current_tenant_id() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''super_admin''::user_role))',
        t
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Policy creation skipped for %: %', t, SQLERRM;
    END;
  END LOOP;

  -- Public-insert variant: WITH CHECK allows inserts targeting any active tenant
  -- (needed for unauthenticated quote requests, magic token flows, system logging)
  FOREACH t IN ARRAY public_insert_tables LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I AS RESTRICTIVE FOR ALL '
        || 'USING (tenant_id = get_current_tenant_id() OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''super_admin''::user_role)) '
        || 'WITH CHECK (tenant_id = get_current_tenant_id() OR EXISTS (SELECT 1 FROM tenants WHERE id = tenant_id AND status = ''active'') OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''super_admin''::user_role))',
        t
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Policy creation skipped for %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;
