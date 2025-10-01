-- Phase 1: Fix infinite recursion in user_roles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create security definer function to check roles (already exists, but ensure it's correct)
-- The check_user_role function already exists and uses security definer properly

-- Create new non-recursive policies for user_roles
CREATE POLICY "Users can view their own roles via function"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Phase 2: Secure supplier_products table
-- Drop overly permissive public policies
DROP POLICY IF EXISTS "Anyone can view supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Public can view supplier products" ON public.supplier_products;

-- Create restricted access policies
CREATE POLICY "Authenticated users can view supplier products"
ON public.supplier_products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage supplier products"
ON public.supplier_products
FOR ALL
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Phase 3: Restrict newsletter_subscriptions access
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.newsletter_subscriptions;

CREATE POLICY "Admins can view all newsletter subscriptions"
ON public.newsletter_subscriptions
FOR SELECT
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage newsletter subscriptions"
ON public.newsletter_subscriptions
FOR ALL
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Keep the public insert policy for the subscription form
-- Policy "Anyone can subscribe to newsletter" remains unchanged

-- Phase 4: Secure failed_login_attempts table
DROP POLICY IF EXISTS "Users can view failed attempts for their email" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Anyone can insert failed login attempts" ON public.failed_login_attempts;

CREATE POLICY "System can insert failed login attempts"
ON public.failed_login_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Admins can view failed login attempts"
ON public.failed_login_attempts
FOR SELECT
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Phase 5: Harden database functions with proper search_path
-- Update validate_session function
CREATE OR REPLACE FUNCTION public.validate_session(p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_valid boolean := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_sessions 
    WHERE session_id = p_session_token 
    AND is_active = true 
    AND expires_at > now()
  ) INTO session_valid;
  
  IF session_valid THEN
    UPDATE user_sessions 
    SET updated_at = now() 
    WHERE session_id = p_session_token;
  END IF;
  
  RETURN session_valid;
END;
$$;

-- Update is_allowed_admin_email function
CREATE OR REPLACE FUNCTION public.is_allowed_admin_email(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed_emails TEXT[] := ARRAY[
    'admin@trustlinkventures.com',
    'manager@trustlinkventures.com',
    'trustlventuresghana_a01@yahoo.com'
  ];
BEGIN
  RETURN user_email = ANY(allowed_emails);
END;
$$;

-- Update assign_admin_role_on_signup function
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_allowed_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Update get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
  RETURN COALESCE(user_role, 'user');
END;
$$;