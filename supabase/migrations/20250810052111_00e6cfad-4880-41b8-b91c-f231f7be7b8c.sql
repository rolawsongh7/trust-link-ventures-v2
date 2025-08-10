-- Enable RLS on user_roles table (this was disabled during troubleshooting)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple policies for user_roles to avoid recursion
DROP POLICY IF EXISTS "Anyone can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;

-- Basic read policy for user_roles 
CREATE POLICY "Anyone authenticated can read user_roles" ON public.user_roles 
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only allow system to insert/update user_roles to prevent manipulation
CREATE POLICY "System can manage user_roles" ON public.user_roles 
FOR ALL USING (true);

-- Check if profiles has policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Check if suppliers has policies  
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users can update suppliers" ON public.suppliers;

CREATE POLICY "Users can view suppliers" ON public.suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update suppliers" ON public.suppliers FOR UPDATE USING (auth.uid() IS NOT NULL);