-- Remove the remaining public access policy on magic_link_tokens
DROP POLICY IF EXISTS "System can manage magic link tokens" ON public.magic_link_tokens;

-- Verify RLS is still enabled
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Add comment to document the security fix
COMMENT ON TABLE public.magic_link_tokens IS 'Magic link tokens for authentication. Access restricted to service role and admins only. Public access removed for security.';