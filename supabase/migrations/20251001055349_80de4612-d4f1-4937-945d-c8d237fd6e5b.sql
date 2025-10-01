-- Fix critical security issues identified in security scan

-- 1. Remove public access to supplier products (competitors could steal supplier data)
DROP POLICY IF EXISTS "Anyone can view active supplier products" ON public.supplier_products;

-- 2. Restrict supplier product management to admins only (was too permissive)
DROP POLICY IF EXISTS "Users can manage supplier products" ON public.supplier_products;

-- 3. Fix infinite recursion in user_roles by removing problematic policy
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- 4. Remove overly permissive read access
DROP POLICY IF EXISTS "Anyone authenticated can read user_roles" ON public.user_roles;

-- 5. Harden database functions with proper search_path (prevents search path attacks)
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