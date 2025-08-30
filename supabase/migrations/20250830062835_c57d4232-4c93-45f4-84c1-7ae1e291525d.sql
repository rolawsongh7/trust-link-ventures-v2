-- Drop existing functions that may conflict
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_role_secure(uuid);

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Convert user_roles.role to text and then to the new enum
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;

-- Drop and recreate the enum type
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('admin', 'sales_rep', 'user');

-- Update existing role values to match new enum
UPDATE public.user_roles SET role = 'admin' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'sales_rep' WHERE role IN ('sales', 'rep', 'sales_rep');
UPDATE public.user_roles SET role = 'user' WHERE role NOT IN ('admin', 'sales', 'rep', 'sales_rep');

-- Convert column to enum type
ALTER TABLE public.user_roles ALTER COLUMN role TYPE user_role USING role::user_role;

-- Core Security Functions
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Secure role checking function for RLS
CREATE OR REPLACE FUNCTION public.get_user_role_secure(check_user_id UUID)
RETURNS user_role
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = check_user_id LIMIT 1),
    'user'::user_role
  );
$$;

-- Admin email validation function
CREATE OR REPLACE FUNCTION public.is_allowed_admin_email(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  allowed_emails TEXT[] := ARRAY[
    'admin@trustlinkventures.com',
    'manager@trustlinkventures.com'
  ];
BEGIN
  RETURN user_email = ANY(allowed_emails);
END;
$$;

-- Auto-assign roles on signup
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_allowed_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'sales_rep'::user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto role assignment
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role_on_signup();

-- User Roles RLS
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR public.get_user_role_secure(auth.uid()) = 'admin'::user_role
);

CREATE POLICY "Admins can manage all user roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.get_user_role_secure(auth.uid()) = 'admin'::user_role)
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin'::user_role);