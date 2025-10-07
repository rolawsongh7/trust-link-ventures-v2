-- Drop duplicate policies if they exist
DROP POLICY IF EXISTS "Admins can view all addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Admins can manage all addresses" ON public.customer_addresses;

-- Recreate admin policies
CREATE POLICY "Admins can view all addresses"
  ON public.customer_addresses
  FOR SELECT
  USING (check_user_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all addresses"
  ON public.customer_addresses
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'));