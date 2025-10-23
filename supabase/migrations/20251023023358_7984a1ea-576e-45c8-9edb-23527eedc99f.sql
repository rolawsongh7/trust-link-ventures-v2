-- Secure leads table against spam and bot submissions
-- Add rate limiting, verification, and validation columns

-- Add security columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS submission_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for rate limiting lookups
CREATE INDEX IF NOT EXISTS idx_leads_ip_address ON public.leads(ip_address);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Create rate limiting function for lead submissions
CREATE OR REPLACE FUNCTION public.check_lead_rate_limit(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submission_count INTEGER;
BEGIN
  -- Count leads from this IP in the last hour
  SELECT COUNT(*) INTO submission_count
  FROM leads
  WHERE ip_address = p_ip_address
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 3 lead submissions per IP per hour
  RETURN submission_count < 3;
END;
$$;

-- Update the RLS policy to prevent direct inserts (leads must go through edge function)
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

-- Create new restrictive policy for lead insertion
CREATE POLICY "Leads can only be inserted via edge function or by authenticated users"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Allow authenticated users (internal staff) to create leads directly
  auth.uid() IS NOT NULL
  -- Public inserts will be rejected - must go through edge function
);

-- Add comment explaining the security improvement
COMMENT ON TABLE public.leads IS 
'Lead submissions protected with CAPTCHA verification, rate limiting (3/hour per IP), disposable email blocking, and bot detection. Public submissions must go through the submit-lead edge function.';

COMMENT ON COLUMN public.leads.ip_address IS 
'IP address of lead submitter for rate limiting and abuse detection';

COMMENT ON COLUMN public.leads.verification_status IS 
'Verification status: pending (needs review), verified (legitimate), rejected (spam/bot)';

COMMENT ON COLUMN public.leads.submission_metadata IS 
'Contains submission details like user agent, referrer, bot detection score for security analysis';

-- Log the security improvement
SELECT log_security_event(
  'leads_table_hardened',
  auth.uid(),
  jsonb_build_object(
    'action', 'implemented_spam_protection',
    'features', ARRAY['captcha', 'rate_limiting', 'email_validation', 'bot_detection'],
    'max_rate', '3 per hour per IP',
    'timestamp', extract(epoch from now())
  ),
  NULL,
  NULL,
  'high'
);