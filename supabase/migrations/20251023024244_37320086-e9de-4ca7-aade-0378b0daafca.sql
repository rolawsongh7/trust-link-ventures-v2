-- Add security columns to communications table
ALTER TABLE public.communications
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submission_metadata jsonb;

-- Create index for rate limiting
CREATE INDEX IF NOT EXISTS idx_communications_ip_created 
ON public.communications(ip_address, created_at);

-- Create rate limiting function for contact form submissions
CREATE OR REPLACE FUNCTION public.check_communication_rate_limit(p_ip_address inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  submission_count INTEGER;
BEGIN
  -- Count communications from this IP in the last hour
  SELECT COUNT(*) INTO submission_count
  FROM communications
  WHERE ip_address = p_ip_address
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 3 contact form submissions per IP per hour
  RETURN submission_count < 3;
END;
$$;

-- Drop the existing open RLS policy
DROP POLICY IF EXISTS "Allow contact form submissions" ON public.communications;

-- Create restrictive RLS policy - only authenticated users (internal staff) can insert
CREATE POLICY "Only authenticated users can create communications"
ON public.communications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Keep existing SELECT policies for authenticated users
-- (This allows staff to view all communications)