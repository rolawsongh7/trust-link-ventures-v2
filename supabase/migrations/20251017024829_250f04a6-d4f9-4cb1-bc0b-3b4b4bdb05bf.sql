-- Fix delivery_history to use built-in gen_random_uuid() instead of pgcrypto
-- This eliminates the dependency on pgcrypto for this table

-- Change delivery_history.id to use the built-in gen_random_uuid() function
ALTER TABLE delivery_history 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Ensure pgcrypto is available in the public schema for other uses (like delivery_tracking_tokens)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Recreate generate_secure_token with explicit schema path to fix session issues
DROP FUNCTION IF EXISTS public.generate_secure_token() CASCADE;

CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Explicitly use public.gen_random_bytes to avoid schema search issues
  SELECT encode(public.gen_random_bytes(32), 'base64') INTO token;
  -- Make it URL safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;

-- Restore the default value for delivery_tracking_tokens.token
ALTER TABLE delivery_tracking_tokens 
  ALTER COLUMN token SET DEFAULT generate_secure_token();