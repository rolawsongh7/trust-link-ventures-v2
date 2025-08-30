-- Drop all existing policies that reference the role column
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert user roles" ON public.user_roles;

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'sales_rep', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop the constraint first
ALTER TABLE public.user_roles 
DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Convert the column type directly with a mapping
ALTER TABLE public.user_roles 
ALTER COLUMN role TYPE user_role USING 
  CASE 
    WHEN role = 'admin' THEN 'admin'::user_role
    WHEN role IN ('sales_rep', 'sales', 'rep') THEN 'sales_rep'::user_role
    ELSE 'user'::user_role
  END;

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
    -- Add your admin emails here
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role_on_signup();

-- User Roles RLS - Users can only see their own roles, admins can see all
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

-- Enhanced RLS Policies for Customers
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can view assigned customers" ON public.customers;
DROP POLICY IF EXISTS "Sales reps can manage assigned customers" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;

-- Customers RLS Policies
CREATE POLICY "Admins can manage all customers" ON public.customers
FOR ALL TO authenticated
USING (public.get_user_role_secure(auth.uid()) = 'admin'::user_role)
WITH CHECK (public.get_user_role_secure(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Sales reps can view assigned customers" ON public.customers
FOR SELECT TO authenticated
USING (
  public.get_user_role_secure(auth.uid()) = 'sales_rep'::user_role 
  AND (assigned_to = auth.uid() OR assigned_to IS NULL)
);

CREATE POLICY "Sales reps can update assigned customers" ON public.customers
FOR UPDATE TO authenticated
USING (
  public.get_user_role_secure(auth.uid()) = 'sales_rep'::user_role 
  AND assigned_to = auth.uid()
)
WITH CHECK (
  public.get_user_role_secure(auth.uid()) = 'sales_rep'::user_role 
  AND assigned_to = auth.uid()
);

CREATE POLICY "Sales reps can create customers" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  public.get_user_role_secure(auth.uid()) IN ('admin'::user_role, 'sales_rep'::user_role)
);