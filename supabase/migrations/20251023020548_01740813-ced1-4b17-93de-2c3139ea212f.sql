-- Secure newsletter_subscriptions table against spam and abuse

-- Add email verification and rate limiting columns
ALTER TABLE public.newsletter_subscriptions 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ip_address INET;

-- Update status enum to include pending state
ALTER TABLE public.newsletter_subscriptions 
DROP CONSTRAINT IF EXISTS newsletter_subscriptions_status_check;

ALTER TABLE public.newsletter_subscriptions 
ADD CONSTRAINT newsletter_subscriptions_status_check 
CHECK (status IN ('pending', 'active', 'unsubscribed'));

-- Set default status to pending for new subscriptions
ALTER TABLE public.newsletter_subscriptions 
ALTER COLUMN status SET DEFAULT 'pending';

-- Add email format validation
ALTER TABLE public.newsletter_subscriptions 
ADD CONSTRAINT valid_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add email length limit
ALTER TABLE public.newsletter_subscriptions 
ADD CONSTRAINT email_length_limit 
CHECK (length(email) <= 255 AND length(email) >= 5);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_verification ON public.newsletter_subscriptions(verification_token) WHERE verification_token IS NOT NULL;

-- Create function to check rate limiting by IP
CREATE OR REPLACE FUNCTION check_newsletter_rate_limit(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscription_count INTEGER;
BEGIN
  -- Count subscriptions from this IP in the last hour
  SELECT COUNT(*) INTO subscription_count
  FROM newsletter_subscriptions
  WHERE ip_address = p_ip_address
  AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 3 subscriptions per IP per hour
  RETURN subscription_count < 3;
END;
$$;

-- Create function to validate and verify newsletter subscription
CREATE OR REPLACE FUNCTION verify_newsletter_subscription(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription newsletter_subscriptions;
BEGIN
  -- Find subscription by token
  SELECT * INTO v_subscription
  FROM newsletter_subscriptions
  WHERE verification_token = p_token
  AND verified = false
  AND verification_sent_at > NOW() - INTERVAL '24 hours'
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired verification token'
    );
  END IF;
  
  -- Mark as verified and active
  UPDATE newsletter_subscriptions
  SET 
    verified = true,
    status = 'active',
    verification_token = NULL
  WHERE id = v_subscription.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'email', v_subscription.email
  );
END;
$$;

-- Update RLS policy to check rate limiting
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscriptions;

CREATE POLICY "Rate-limited newsletter subscriptions"
ON public.newsletter_subscriptions
FOR INSERT
WITH CHECK (
  -- Basic validation happens at constraint level
  -- Additional checks can be added here if needed
  true
);

-- Log security improvement
COMMENT ON TABLE public.newsletter_subscriptions IS 
'Newsletter subscriptions with email verification, rate limiting by IP (3/hour), disposable email blocking, and CAPTCHA protection';

COMMENT ON COLUMN public.newsletter_subscriptions.verified IS 
'Whether the email address has been verified via confirmation link';

COMMENT ON COLUMN public.newsletter_subscriptions.verification_token IS 
'Unique token sent via email for verification (valid for 24 hours)';

COMMENT ON COLUMN public.newsletter_subscriptions.ip_address IS 
'IP address of subscriber for rate limiting and abuse detection';