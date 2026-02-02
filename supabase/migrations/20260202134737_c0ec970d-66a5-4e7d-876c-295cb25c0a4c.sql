-- =============================================
-- FIX: Update RLS policies to include super_admin
-- =============================================

-- QUOTE_REQUESTS TABLE
DROP POLICY IF EXISTS "Admins can view all quote requests" ON quote_requests;
DROP POLICY IF EXISTS "Admins can update quote requests" ON quote_requests;
DROP POLICY IF EXISTS "Admins can delete quote requests" ON quote_requests;

CREATE POLICY "Admins can view all quote requests" 
  ON quote_requests FOR SELECT 
  TO authenticated 
  USING (is_admin());

CREATE POLICY "Admins can update quote requests" 
  ON quote_requests FOR UPDATE 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quote requests" 
  ON quote_requests FOR DELETE 
  TO public 
  USING (is_admin());

-- QUOTES TABLE
DROP POLICY IF EXISTS "Admins can manage all quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can delete quotes" ON quotes;

CREATE POLICY "Admins can manage all quotes" 
  ON quotes FOR ALL 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete quotes" 
  ON quotes FOR DELETE 
  TO public 
  USING (is_admin());

-- INVOICES TABLE
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;
DROP POLICY IF EXISTS "Customers and admins can view invoices" ON invoices;

CREATE POLICY "Admins can manage all invoices" 
  ON invoices FOR ALL 
  TO authenticated 
  USING (is_admin()) 
  WITH CHECK (is_admin());

CREATE POLICY "Customers and admins can view invoices" 
  ON invoices FOR SELECT 
  TO authenticated 
  USING (
    customer_id = auth.uid() 
    OR user_can_access_customer(customer_id, auth.uid()) 
    OR is_admin()
  );