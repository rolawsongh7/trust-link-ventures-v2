-- Enhance assign_admin_role_on_signup with comprehensive error handling and audit logging
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_admin_email BOOLEAN;
BEGIN
  -- Check if email is in admin whitelist
  is_admin_email := public.is_allowed_admin_email(NEW.email);
  
  BEGIN
    IF is_admin_email THEN
      -- Assign admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
      
      -- Log admin role assignment for audit trail
      PERFORM public.log_security_event(
        'admin_role_assigned',
        NEW.id,
        jsonb_build_object(
          'email', NEW.email,
          'method', 'domain_whitelist',
          'auto_assigned', true,
          'timestamp', extract(epoch from now())
        ),
        NULL,
        NULL,
        'medium'
      );
    ELSE
      -- Assign default user role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'user')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    PERFORM public.log_security_event(
      'role_assignment_failed',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'error_message', SQLERRM,
        'error_state', SQLSTATE,
        'attempted_role', CASE WHEN is_admin_email THEN 'admin' ELSE 'user' END
      ),
      NULL,
      NULL,
      'high'
    );
    
    -- Only re-raise if it's NOT a unique constraint violation (duplicate role)
    -- Code 23505 is unique_violation
    IF SQLSTATE NOT IN ('23505') THEN
      RAISE WARNING 'Role assignment failed for user %: %', NEW.email, SQLERRM;
    END IF;
  END;
  
  RETURN NEW;
END;
$function$;