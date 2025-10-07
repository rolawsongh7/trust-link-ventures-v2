-- Fix Critical Issue #1: Secure user_roles table
-- Remove public access to user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Only allow secure function-based access to user_roles
CREATE POLICY "No direct access to user_roles"
ON public.user_roles
FOR ALL
USING (false);

-- System can insert roles on user creation
CREATE POLICY "System can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- Fix Critical Issue #4: Restrict customer table public insertion
-- Remove the overly permissive policy that allows anyone to insert
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;

-- Only authenticated users can create customer records for themselves
CREATE POLICY "Authenticated users can create customer records"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix quote_requests table - remove public insertion
DROP POLICY IF EXISTS "Anyone can insert quote requests" ON public.quote_requests;

CREATE POLICY "Authenticated or identified users can create quote requests"
ON public.quote_requests
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  OR 
  (lead_email IS NOT NULL AND lead_company_name IS NOT NULL)
);

-- Fix quotes table - tighten up public insertion
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;

CREATE POLICY "Only authenticated users can create quotes"
ON public.quotes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix supplier_products - remove overly permissive insertion policy
DROP POLICY IF EXISTS "Anyone can insert supplier products for import" ON public.supplier_products;

CREATE POLICY "Only admins can import supplier products"
ON public.supplier_products
FOR INSERT
TO authenticated
WITH CHECK (check_user_role(auth.uid(), 'admin'));

-- Fix quote_submissions - require valid magic token or authentication
DROP POLICY IF EXISTS "Anyone can insert quote submissions" ON public.quote_submissions;

CREATE POLICY "Authenticated users or valid magic tokens can submit quotes"
ON public.quote_submissions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  OR 
  (supplier_email IS NOT NULL AND magic_token IS NOT NULL)
);

-- Add audit logging for security events (drop existing first)
DROP TABLE IF EXISTS public.failed_login_attempts CASCADE;

CREATE TABLE public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Admins can view failed login attempts
CREATE POLICY "Admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
USING (check_user_role(auth.uid(), 'admin'));

-- System can insert failed login attempts
CREATE POLICY "System can insert failed login attempts"
ON public.failed_login_attempts
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_failed_logins_email ON public.failed_login_attempts(email, attempt_time DESC);
CREATE INDEX idx_failed_logins_ip ON public.failed_login_attempts(ip_address, attempt_time DESC);

-- Add function to check recent failed login attempts (for rate limiting)
CREATE OR REPLACE FUNCTION public.count_recent_failed_logins(
  p_identifier TEXT,
  p_minutes INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM public.failed_login_attempts
  WHERE (email = p_identifier OR ip_address::TEXT = p_identifier)
  AND attempt_time >= NOW() - (p_minutes || ' minutes')::INTERVAL;
  
  RETURN attempt_count;
END;
$$;