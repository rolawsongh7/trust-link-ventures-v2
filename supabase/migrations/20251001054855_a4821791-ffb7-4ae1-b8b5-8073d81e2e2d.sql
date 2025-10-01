-- Fix security issue: Restrict quote_requests SELECT access to admins and owners only

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view quote requests" ON public.quote_requests;

-- Add admin-only SELECT policy
CREATE POLICY "Admins can view all quote requests"
ON public.quote_requests
FOR SELECT
TO authenticated
USING (check_user_role(auth.uid(), 'admin'));

-- Allow customers to view their own quote requests
CREATE POLICY "Customers can view their own quote requests"
ON public.quote_requests
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Restrict UPDATE to admins only (more secure than any authenticated user)
DROP POLICY IF EXISTS "Users can update quote requests" ON public.quote_requests;

CREATE POLICY "Admins can update quote requests"
ON public.quote_requests
FOR UPDATE
TO authenticated
USING (check_user_role(auth.uid(), 'admin'))
WITH CHECK (check_user_role(auth.uid(), 'admin'));