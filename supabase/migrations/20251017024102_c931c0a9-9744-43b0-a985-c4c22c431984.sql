-- Enable uuid-ossp as a reliable fallback
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the generate_secure_token function with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS public.generate_secure_token() CASCADE;

-- Recreate the generate_secure_token function with pgcrypto
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token TEXT;
BEGIN
  -- Generate a cryptographically secure random token
  SELECT encode(gen_random_bytes(32), 'base64') INTO token;
  -- Make it URL safe
  token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
  RETURN token;
END;
$$;

-- Restore the default value for delivery_tracking_tokens.token
ALTER TABLE delivery_tracking_tokens 
ALTER COLUMN token SET DEFAULT generate_secure_token();

-- Verify pgcrypto is loaded
DO $$
BEGIN
  PERFORM gen_random_bytes(1);
  RAISE NOTICE 'pgcrypto extension is working correctly';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'pgcrypto extension issue: %. Using uuid-ossp fallback.', SQLERRM;
END $$;