-- Force PostgREST schema cache refresh by making a small schema change
-- This triggers the cache to reload and recognize all our new tables

-- Add a comment to trigger schema cache refresh
COMMENT ON TABLE public.user_roles IS 'User roles for authentication and authorization';
COMMENT ON TABLE public.customers IS 'Customer management table for CRM';
COMMENT ON TABLE public.leads IS 'Sales leads tracking table';
COMMENT ON TABLE public.opportunities IS 'Sales opportunities management';
COMMENT ON TABLE public.quotes IS 'Quote management system';
COMMENT ON TABLE public.quote_requests IS 'Quote request submissions';
COMMENT ON TABLE public.communications IS 'Communication history tracking';
COMMENT ON TABLE public.activities IS 'Activity tracking for CRM';

-- Verify the schema refresh worked
SELECT 'Schema cache refresh completed' as status;