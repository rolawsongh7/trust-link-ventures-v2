-- Fix customer contact information security issue
-- Replace email-based access with secure user ID mapping

-- 1. Create customer_users mapping table
CREATE TABLE IF NOT EXISTS public.customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(customer_id, user_id)
);

-- Enable RLS on customer_users
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_users_user_id ON public.customer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON public.customer_users(customer_id);

-- 2. RLS policies for customer_users table
CREATE POLICY "Users can view their own customer mappings"
ON public.customer_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all customer mappings"
ON public.customer_users
FOR ALL
TO authenticated
USING (check_user_role(auth.uid(), 'admin'))
WITH CHECK (check_user_role(auth.uid(), 'admin'));

-- 3. Create security definer function for customer access check
CREATE OR REPLACE FUNCTION public.user_can_access_customer(p_customer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can access all customers
  IF check_user_role(p_user_id, 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is linked to this customer
  RETURN EXISTS (
    SELECT 1 FROM customer_users
    WHERE customer_id = p_customer_id
    AND user_id = p_user_id
  );
END;
$$;

-- 4. Drop the insecure email-based policy
DROP POLICY IF EXISTS "Customers can view their own profile by email" ON public.customers;

-- 5. Create new secure policy using user_can_access_customer function
CREATE POLICY "Customers can view their linked profiles"
ON public.customers
FOR SELECT
TO authenticated
USING (
  user_can_access_customer(id, auth.uid())
);

-- 6. Update customer_addresses policies to use the new secure method
DROP POLICY IF EXISTS "Customers can view own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can create own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can update own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers can delete own addresses" ON public.customer_addresses;

CREATE POLICY "Customers can view their linked addresses"
ON public.customer_addresses
FOR SELECT
TO authenticated
USING (user_can_access_customer(customer_id, auth.uid()));

CREATE POLICY "Customers can create addresses for linked accounts"
ON public.customer_addresses
FOR INSERT
TO authenticated
WITH CHECK (user_can_access_customer(customer_id, auth.uid()));

CREATE POLICY "Customers can update their linked addresses"
ON public.customer_addresses
FOR UPDATE
TO authenticated
USING (user_can_access_customer(customer_id, auth.uid()))
WITH CHECK (user_can_access_customer(customer_id, auth.uid()));

CREATE POLICY "Customers can delete their linked addresses"
ON public.customer_addresses
FOR DELETE
TO authenticated
USING (user_can_access_customer(customer_id, auth.uid()));

-- 7. Update invoices policy to use secure method
DROP POLICY IF EXISTS "Customers can view their own invoices" ON public.invoices;

CREATE POLICY "Customers can view invoices for linked accounts"
ON public.invoices
FOR SELECT
TO authenticated
USING (user_can_access_customer(customer_id, auth.uid()));

-- 8. Update orders policy to use secure method
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;

CREATE POLICY "Customers can view orders for linked accounts"
ON public.orders
FOR SELECT
TO authenticated
USING (user_can_access_customer(customer_id, auth.uid()));

-- 9. Update invoice_items policy
DROP POLICY IF EXISTS "Customers can view their own invoice items" ON public.invoice_items;

CREATE POLICY "Customers can view invoice items for linked accounts"
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices 
    WHERE user_can_access_customer(customer_id, auth.uid())
  )
);

-- Add helpful comments
COMMENT ON TABLE public.customer_users IS 
'Secure mapping between auth.users and customers. Replaces insecure email-based access control.';

COMMENT ON FUNCTION public.user_can_access_customer IS 
'Security definer function to check if a user can access a customer record. Uses secure auth.uid() instead of email matching.';

-- Log the security improvement
SELECT log_security_event(
  'customer_access_hardened',
  auth.uid(),
  jsonb_build_object(
    'action', 'replaced_email_based_rls',
    'reason', 'Prevent contact information harvesting via compromised JWTs',
    'improvement', 'Now using secure user_id mapping instead of email claims',
    'timestamp', extract(epoch from now())
  ),
  NULL,
  NULL,
  'high'
);