-- Remove supplier role infrastructure (keep enum for backward compatibility)

-- 1. Delete existing supplier role assignments
-- First convert to text to allow the comparison
DO $$
BEGIN
  -- Delete supplier assignments using a text comparison
  DELETE FROM public.user_roles 
  WHERE role::text = 'supplier';
END $$;

-- 2. Drop supplier-specific infrastructure
DROP VIEW IF EXISTS public.supplier_dashboard_stats CASCADE;
DROP FUNCTION IF EXISTS public.get_user_supplier_id(UUID) CASCADE;
DROP TABLE IF EXISTS public.supplier_users CASCADE;

-- 3. Add comment documenting that supplier role is deprecated
COMMENT ON TYPE public.user_role IS 'User roles: admin, sales_rep, user. Note: supplier is deprecated and should not be used.';