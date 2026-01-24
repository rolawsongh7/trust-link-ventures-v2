-- Fix delivery_tracking_tokens public exposure
-- Remove overly permissive public policies

-- Drop dangerous public policies
DROP POLICY IF EXISTS "System can manage delivery tracking tokens" ON public.delivery_tracking_tokens;
DROP POLICY IF EXISTS "System can insert tracking tokens" ON public.delivery_tracking_tokens;
DROP POLICY IF EXISTS "System can update token access times" ON public.delivery_tracking_tokens;

-- Keep the existing secure policies:
-- "Admins can manage tracking tokens" - admin only
-- "Admins can view all tracking tokens" - admin only  
-- "Customers can view their own order tracking tokens" - customer's own orders only

-- Add service_role policy for edge functions to manage tokens
CREATE POLICY "Service role can manage tracking tokens"
ON public.delivery_tracking_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Note: Tracking tokens should only be accessible by:
-- 1. Admins (existing policies)
-- 2. Customers viewing their own orders (existing policy)
-- 3. Service role for edge functions to create/validate tokens