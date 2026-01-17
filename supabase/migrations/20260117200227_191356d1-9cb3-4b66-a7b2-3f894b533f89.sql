-- Fix check_user_role to use user_roles table instead of profiles
CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND role::text = required_role
  );
$$;

-- Fix is_admin to use user_roles table instead of profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Create missing profile record for admin user
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  '7fca904d-7b99-45ae-8f40-b710dc149cf2',
  'info@trustlinkcompany.com',
  'Trust Link Admin',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;