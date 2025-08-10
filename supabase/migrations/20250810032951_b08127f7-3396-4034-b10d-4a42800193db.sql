-- Create user_role enum
CREATE TYPE public.user_role AS ENUM ('admin', 'user', 'moderator');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'admin'
    )
);

-- Create a new function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(user_uuid uuid, role_name user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = role_name
  );
$function$;

-- Update the existing get_user_role function to use the new user_roles table
-- while maintaining backward compatibility
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = user_uuid LIMIT 1),
    'user'
  );
$function$;

-- Create trigger for user_roles updated_at
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();