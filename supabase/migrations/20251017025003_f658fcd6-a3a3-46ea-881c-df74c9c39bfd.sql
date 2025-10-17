-- Drop and recreate pgcrypto extension to ensure it's in the extensions schema
DROP EXTENSION IF EXISTS pgcrypto CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Update delivery_history to explicitly use gen_random_uuid (no pgcrypto needed)
ALTER TABLE delivery_history 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop the old generate_secure_token function
DROP FUNCTION IF EXISTS public.generate_secure_token() CASCADE;

-- Recreate generate_secure_token to use extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Use extensions.gen_random_bytes explicitly
  SELECT encode(extensions.gen_random_bytes(32), 'base64') INTO token;
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;

-- Restore delivery_tracking_tokens default
ALTER TABLE delivery_tracking_tokens 
  ALTER COLUMN token SET DEFAULT public.generate_secure_token();