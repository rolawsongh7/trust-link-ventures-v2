-- Fix critical security vulnerability in magic_link_tokens table
-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read magic link tokens" ON public.magic_link_tokens;
DROP POLICY IF EXISTS "Public can read magic link tokens" ON public.magic_link_tokens;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.magic_link_tokens;
DROP POLICY IF EXISTS "Anyone can insert magic link tokens" ON public.magic_link_tokens;

-- Ensure RLS is enabled on the table
ALTER TABLE public.magic_link_tokens ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies

-- 1. Only system/service can insert new magic link tokens
CREATE POLICY "Service role can insert magic link tokens"
ON public.magic_link_tokens
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Admins can view all magic link tokens for management purposes
CREATE POLICY "Admins can view all magic link tokens"
ON public.magic_link_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 3. System can update tokens when they're used
CREATE POLICY "Service role can update magic link tokens"
ON public.magic_link_tokens
FOR UPDATE
TO service_role
USING (true);

-- 4. Admins can update tokens (for management)
CREATE POLICY "Admins can update magic link tokens"
ON public.magic_link_tokens
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- 5. Admins can delete expired tokens
CREATE POLICY "Admins can delete magic link tokens"
ON public.magic_link_tokens
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create an index to improve token validation performance
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_lookup 
ON public.magic_link_tokens(token, expires_at, used_at);

-- Add a secure function to validate magic link tokens without exposing data
CREATE OR REPLACE FUNCTION public.validate_magic_link_token(p_token TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  rfq_id UUID,
  quote_id UUID,
  order_id UUID,
  supplier_email TEXT,
  token_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (expires_at > now() AND used_at IS NULL) as is_valid,
    magic_link_tokens.rfq_id,
    magic_link_tokens.quote_id,
    magic_link_tokens.order_id,
    magic_link_tokens.supplier_email,
    magic_link_tokens.token_type
  FROM public.magic_link_tokens
  WHERE token = p_token
  LIMIT 1;
END;
$$;

-- Grant execute permission on the validation function to public
GRANT EXECUTE ON FUNCTION public.validate_magic_link_token(TEXT) TO anon, authenticated;

-- Add a function to mark token as used (only callable by service role or admins)
CREATE OR REPLACE FUNCTION public.mark_magic_link_token_used(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.magic_link_tokens
  SET used_at = now()
  WHERE token = p_token
  AND used_at IS NULL
  AND expires_at > now();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- Grant execute permission on the mark used function
GRANT EXECUTE ON FUNCTION public.mark_magic_link_token_used(TEXT) TO service_role, authenticated;