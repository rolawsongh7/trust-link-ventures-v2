-- Automatically populate customer_users mapping based on email matching
-- This migration links existing customers to their user accounts

-- Insert mappings for customers whose email matches an auth.users email
INSERT INTO public.customer_users (customer_id, user_id, created_by)
SELECT 
  c.id as customer_id,
  u.id as user_id,
  u.id as created_by
FROM public.customers c
INNER JOIN auth.users u ON LOWER(c.email) = LOWER(u.email)
WHERE c.email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customer_users cu 
    WHERE cu.customer_id = c.id AND cu.user_id = u.id
  )
ON CONFLICT (customer_id, user_id) DO NOTHING;

-- Log how many mappings were created
DO $$
DECLARE
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM public.customer_users;
  
  RAISE NOTICE 'Customer-user mappings created. Total mappings: %', mapping_count;
  
  -- Log this action for audit trail
  PERFORM log_security_event(
    'customer_users_populated',
    NULL,
    jsonb_build_object(
      'action', 'automated_mapping_creation',
      'method', 'email_matching',
      'total_mappings', mapping_count,
      'timestamp', extract(epoch from now())
    ),
    NULL,
    NULL,
    'medium'
  );
END $$;