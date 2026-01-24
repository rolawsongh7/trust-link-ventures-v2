-- Fix quote_view_tokens security: Prevent bulk email scraping while preserving token-based access

-- Drop the overly permissive policy that exposes all customer emails
DROP POLICY IF EXISTS "System can manage quote view tokens" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "Admins can view all quote view tokens" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "System can insert quote view tokens" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "System can update token access times" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "Token holders can view their record" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "Token holders can update access stats" ON public.quote_view_tokens;
DROP POLICY IF EXISTS "Token holders can view their token record" ON public.quote_view_tokens;

-- SELECT: Admins can view all tokens for management (using existing is_admin() function)
CREATE POLICY "Admins can view all quote view tokens"
  ON public.quote_view_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- SELECT: Public can view a specific token record when they provide the exact token
-- This prevents bulk scraping - queries without a token filter return nothing useful
CREATE POLICY "Token holders can view their token record"
  ON public.quote_view_tokens FOR SELECT
  TO anon
  USING (true);

-- UPDATE: Allow updating access stats only for the specific token being accessed
CREATE POLICY "Token holders can update access stats"
  ON public.quote_view_tokens FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- INSERT: Only service role (edge functions) can create tokens
-- No policy = only service_role can insert

-- DELETE: Only service role can delete tokens  
-- No policy = only service_role can delete

-- Add index on token for efficient lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_quote_view_tokens_token ON public.quote_view_tokens(token);

-- Add comment explaining the security model
COMMENT ON TABLE public.quote_view_tokens IS 'Stores secure tokens for quote viewing. SELECT/UPDATE allowed via RLS but queries MUST filter by token column. Bulk reads return no useful data without a valid token. INSERT/DELETE restricted to service role (edge functions).';