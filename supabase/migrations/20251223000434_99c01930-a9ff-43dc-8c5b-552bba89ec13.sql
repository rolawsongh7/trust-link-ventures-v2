-- Create helper function to check super_admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'super_admin'
  )
$$;

-- Create trigger function to auto-assign super_admin to support@trustlinkcompany.com
CREATE OR REPLACE FUNCTION public.assign_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email is support@trustlinkcompany.com
  IF NEW.email = 'support@trustlinkcompany.com' THEN
    -- Assign super_admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the assignment for audit trail
    PERFORM public.log_security_event(
      'super_admin_role_assigned',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'method', 'auto_trigger',
        'timestamp', extract(epoch from now())
      ),
      NULL,
      NULL,
      'high'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for auto-assignment
DROP TRIGGER IF EXISTS on_support_user_created ON auth.users;
CREATE TRIGGER on_support_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_super_admin_role();