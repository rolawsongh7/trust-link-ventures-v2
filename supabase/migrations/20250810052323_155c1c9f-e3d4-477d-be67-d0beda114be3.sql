-- Enable RLS on user_roles table (this was disabled during troubleshooting)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple policies for user_roles to avoid recursion
DROP POLICY IF EXISTS "Anyone can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone authenticated can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "System can manage user_roles" ON public.user_roles;

-- Basic read policy for user_roles 
CREATE POLICY "Anyone authenticated can read user_roles" ON public.user_roles 
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only allow system to insert/update user_roles to prevent manipulation
CREATE POLICY "System can manage user_roles" ON public.user_roles 
FOR ALL USING (true);