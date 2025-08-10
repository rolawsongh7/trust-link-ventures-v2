-- Create helper function to check user roles
CREATE OR REPLACE FUNCTION public.check_user_role(check_user_id UUID, required_role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = check_user_id AND role::text = required_role
  );
$$;