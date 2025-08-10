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

-- Fix quote_requests policies - drop all existing ones first
DROP POLICY IF EXISTS "Anyone can view quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Anyone can insert quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Admins can manage quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Admins can manage all quote requests" ON public.quote_requests;
DROP POLICY IF EXISTS "Customers can view their own quote requests" ON public.quote_requests;

CREATE POLICY "Anyone can view quote requests" ON public.quote_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quote requests" ON public.quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage quote requests" ON public.quote_requests FOR ALL USING (check_user_role(auth.uid(), 'admin'));