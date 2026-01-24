-- Fix magic_link_tokens public exposure
-- Remove the overly permissive public policy that exposes tokens

-- Drop the dangerous public policy
DROP POLICY IF EXISTS "System can manage magic link tokens" ON public.magic_link_tokens;

-- Ensure only admins and service role can SELECT tokens
-- The existing "Admins can view all magic link tokens" policy already restricts authenticated access properly

-- Add a policy for edge functions using service_role to read tokens for validation
CREATE POLICY "Service role can read magic link tokens"
ON public.magic_link_tokens
FOR SELECT
TO service_role
USING (true);

-- Note: Magic link tokens should NEVER be readable by the public or regular authenticated users
-- They are validated server-side via edge functions using the service_role