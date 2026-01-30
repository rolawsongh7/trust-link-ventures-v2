-- Phase 1: Promote info@trustlinkcompany.com to super_admin
-- This is a one-time safe promotion that doesn't affect other admins

-- Step 1: Update existing admin role to super_admin
UPDATE public.user_roles 
SET role = 'super_admin'
WHERE user_id = '7fca904d-7b99-45ae-8f40-b710dc149cf2'
AND role = 'admin';

-- Step 2: If no row was updated (user might not have admin), insert super_admin
INSERT INTO public.user_roles (user_id, role)
SELECT '7fca904d-7b99-45ae-8f40-b710dc149cf2', 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '7fca904d-7b99-45ae-8f40-b710dc149cf2' 
  AND role = 'super_admin'
);

-- Step 3: Update auto-trigger to use new super admin email
CREATE OR REPLACE FUNCTION public.assign_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-assign super_admin role to info@trustlinkcompany.com
  IF NEW.email = 'info@trustlinkcompany.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    PERFORM public.log_security_event(
      'super_admin_role_assigned',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'method', 'auto_trigger',
        'timestamp', extract(epoch from now())
      ),
      NULL, NULL, 'high'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Log the promotion in audit trail
INSERT INTO public.audit_logs (
  user_id, 
  event_type, 
  action, 
  severity, 
  event_data,
  ip_address
) VALUES (
  '7fca904d-7b99-45ae-8f40-b710dc149cf2',
  'role_changed',
  'Promoted to super_admin',
  'high',
  jsonb_build_object(
    'email', 'info@trustlinkcompany.com',
    'previous_role', 'admin',
    'new_role', 'super_admin',
    'promoted_at', now(),
    'method', 'database_migration'
  ),
  '0.0.0.0'::inet
);

-- Phase 2: Create secure RPC function for role changes with super admin guard
CREATE OR REPLACE FUNCTION public.change_user_role_secure(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_role text;
  v_caller_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_target_email text;
BEGIN
  -- Check if caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if caller is super_admin
  v_is_super_admin := is_super_admin(v_caller_id);
  
  -- Check if caller has at least admin access
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get target user's current role and email
  SELECT ur.role::text, au.email INTO v_current_role, v_target_email
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.user_id = p_target_user_id
  ORDER BY ur.created_at DESC
  LIMIT 1;
  
  -- If no role found, default to 'user'
  IF v_current_role IS NULL THEN
    v_current_role := 'user';
  END IF;
  
  -- Prevent modification of super_admin
  IF v_current_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot modify super admin role';
  END IF;
  
  -- Only super_admin can assign/remove admin role
  IF (p_new_role = 'admin' OR v_current_role = 'admin') AND NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only super admin can assign or remove admin role';
  END IF;
  
  -- Prevent assigning super_admin via this function
  IF p_new_role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot assign super_admin role through this function';
  END IF;
  
  -- Prevent self-demotion for super_admin
  IF p_target_user_id = v_caller_id AND v_is_super_admin THEN
    RAISE EXCEPTION 'Super admin cannot modify their own role';
  END IF;
  
  -- Validate role value
  IF p_new_role NOT IN ('admin', 'sales_rep', 'moderator', 'user') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;
  
  -- Perform the role change: delete existing and insert new
  DELETE FROM public.user_roles WHERE user_id = p_target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (p_target_user_id, p_new_role::app_role);
  
  -- Log the action
  PERFORM log_security_event(
    'role_changed',
    v_caller_id,
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'target_email', v_target_email,
      'old_role', v_current_role,
      'new_role', p_new_role,
      'changed_by_super_admin', v_is_super_admin
    ),
    NULL, NULL, 'high'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'old_role', v_current_role,
    'new_role', p_new_role,
    'target_user_id', p_target_user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.change_user_role_secure(uuid, text) TO authenticated;