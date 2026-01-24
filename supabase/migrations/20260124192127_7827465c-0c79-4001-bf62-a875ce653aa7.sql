-- Restrict supplier_products modifications to admins only
-- This prevents authenticated customers from modifying the product catalog

-- Create admin-only INSERT policy
CREATE POLICY "Only admins can insert products"
ON public.supplier_products
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Create admin-only UPDATE policy
CREATE POLICY "Only admins can update products"
ON public.supplier_products
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Create admin-only DELETE policy
CREATE POLICY "Only admins can delete products"
ON public.supplier_products
FOR DELETE
TO authenticated
USING (public.is_admin());