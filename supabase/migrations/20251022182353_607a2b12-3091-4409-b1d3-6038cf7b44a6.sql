-- ============================================
-- Security Fix: Delivery Tracking Tokens (Safe Version)
-- Fix RLS vulnerability and add rate limiting
-- ============================================

-- Step 1: Drop any existing insecure or conflicting policies
DROP POLICY IF EXISTS "Anyone can view with valid token" ON public.delivery_tracking_tokens;
DROP POLICY IF EXISTS "Admins can view all tracking tokens" ON public.delivery_tracking_tokens;
DROP POLICY IF EXISTS "System can update token access times" ON public.delivery_tracking_tokens;

-- Step 2: Create secure RLS policies

-- Policy 1: Only admins can browse all tracking tokens
CREATE POLICY "Admins can view all tracking tokens"
ON public.delivery_tracking_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Policy 2: System can update token access timestamps
CREATE POLICY "System can update token access times"
ON public.delivery_tracking_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Step 3: Create rate limiting infrastructure (only if not exists)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tracking_access_logs') THEN
    CREATE TABLE public.tracking_access_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ip_address inet NOT NULL,
      token_accessed text,
      success boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    
    -- Add indexes
    CREATE INDEX idx_tracking_logs_ip_time 
    ON public.tracking_access_logs(ip_address, created_at DESC);
    
    CREATE INDEX idx_tracking_logs_success 
    ON public.tracking_access_logs(success, created_at DESC) 
    WHERE success = false;
    
    -- Enable RLS
    ALTER TABLE public.tracking_access_logs ENABLE ROW LEVEL SECURITY;
    
    -- Add comment
    COMMENT ON TABLE public.tracking_access_logs IS 'Logs all tracking token access attempts for security monitoring and rate limiting.';
  END IF;
END $$;

-- Drop and recreate RLS policies for tracking_access_logs
DROP POLICY IF EXISTS "Admins can view tracking logs" ON public.tracking_access_logs;
DROP POLICY IF EXISTS "System can log tracking access" ON public.tracking_access_logs;

CREATE POLICY "Admins can view tracking logs"
ON public.tracking_access_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "System can log tracking access"
ON public.tracking_access_logs
FOR INSERT
WITH CHECK (true);

-- Step 4: Update the tracking function with rate limiting
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token(p_token text)
RETURNS TABLE(
  order_id uuid,
  order_number text,
  status text,
  tracking_number text,
  carrier text,
  estimated_delivery_date date,
  actual_delivery_date date,
  created_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  delivery_notes text,
  delivery_window text,
  customer_name text,
  delivery_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
  v_failed_attempts integer;
BEGIN
  -- Check if token exists and is valid
  SELECT (expires_at > now())
  INTO v_valid
  FROM delivery_tracking_tokens
  WHERE token = p_token;
  
  -- Log the access attempt
  INSERT INTO tracking_access_logs (ip_address, token_accessed, success)
  VALUES ('0.0.0.0'::inet, p_token, COALESCE(v_valid, false));
  
  -- Check for rate limiting: count failed attempts in last 5 minutes
  SELECT COUNT(*)::integer
  INTO v_failed_attempts
  FROM tracking_access_logs
  WHERE success = false
  AND created_at > now() - interval '5 minutes';
  
  -- Block if more than 20 failed attempts in 5 minutes
  IF v_failed_attempts > 20 THEN
    RAISE EXCEPTION 'Too many failed tracking attempts. Please try again later.'
      USING HINT = 'Rate limit exceeded. Wait 5 minutes.';
  END IF;
  
  -- Return order data if token is valid
  IF v_valid THEN
    -- Update last accessed timestamp
    UPDATE delivery_tracking_tokens 
    SET last_accessed_at = now() 
    WHERE token = p_token;
    
    -- Return order details
    RETURN QUERY
    SELECT 
      o.id,
      o.order_number,
      o.status::TEXT,
      o.tracking_number,
      o.carrier,
      o.estimated_delivery_date,
      o.actual_delivery_date,
      o.created_at,
      o.shipped_at,
      o.delivered_at,
      o.delivery_notes,
      o.delivery_window,
      c.company_name,
      CONCAT(
        ca.street_address, ', ',
        COALESCE(ca.area, ''), ', ',
        ca.city, ', ',
        ca.region, ' - ',
        ca.ghana_digital_address
      )
    FROM delivery_tracking_tokens dtt
    JOIN orders o ON o.id = dtt.order_id
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN customer_addresses ca ON ca.id = o.delivery_address_id
    WHERE dtt.token = p_token
    AND dtt.expires_at > now()
    LIMIT 1;
  END IF;
END;
$$;

-- Step 5: Add cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_tracking_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM tracking_access_logs
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Add function comments
COMMENT ON FUNCTION public.get_order_by_tracking_token(text) IS 'Securely retrieves order details by tracking token. Includes rate limiting (20 failed attempts per 5 minutes) and access logging.';
COMMENT ON FUNCTION public.cleanup_old_tracking_logs() IS 'Deletes tracking logs older than 30 days. Run periodically for maintenance.';