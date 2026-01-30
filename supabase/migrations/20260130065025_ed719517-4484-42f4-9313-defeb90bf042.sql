-- Phase 1.5: Money Flows Stabilization
-- A1: Harden payment_status trigger to always recalculate (no manual overrides)
-- D1: Audit and fix RLS for payment_records

-- A1: Update the payment status trigger to always derive payment_status
CREATE OR REPLACE FUNCTION public.update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Always recalculate payment_status based on payment_amount_confirmed
  -- Never trust manual input - status is derived from financial data
  IF NEW.payment_amount_confirmed IS NULL OR NEW.payment_amount_confirmed = 0 THEN
    NEW.payment_status := 'unpaid'::public.payment_status_enum;
    NEW.balance_remaining := NEW.total_amount;
  ELSIF NEW.payment_amount_confirmed < NEW.total_amount THEN
    NEW.payment_status := 'partially_paid'::public.payment_status_enum;
    NEW.balance_remaining := NEW.total_amount - NEW.payment_amount_confirmed;
  ELSIF NEW.payment_amount_confirmed = NEW.total_amount THEN
    NEW.payment_status := 'fully_paid'::public.payment_status_enum;
    NEW.balance_remaining := 0;
  ELSE
    NEW.payment_status := 'overpaid'::public.payment_status_enum;
    NEW.balance_remaining := NEW.total_amount - NEW.payment_amount_confirmed; -- negative value indicates overpayment
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger runs on both INSERT and UPDATE
DROP TRIGGER IF EXISTS update_order_payment_status_trigger ON public.orders;
CREATE TRIGGER update_order_payment_status_trigger
  BEFORE INSERT OR UPDATE OF payment_amount_confirmed, total_amount ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_payment_status();

-- D1: Audit and ensure RLS for payment_records
-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "customers_view_own_payment_records" ON public.payment_records;
DROP POLICY IF EXISTS "customers_cannot_insert_payment_records" ON public.payment_records;
DROP POLICY IF EXISTS "customers_cannot_update_payment_records" ON public.payment_records;
DROP POLICY IF EXISTS "customers_cannot_delete_payment_records" ON public.payment_records;

-- Customer can only SELECT their own payment records (via order → customer link)
CREATE POLICY "customers_view_own_payment_records" ON public.payment_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN customer_users cu ON o.customer_id = cu.customer_id
    WHERE o.id = payment_records.order_id
    AND cu.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);

-- Customers cannot INSERT payment records (admin only)
CREATE POLICY "customers_cannot_insert_payment_records" ON public.payment_records
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);

-- Customers cannot UPDATE payment records (admin only)
CREATE POLICY "customers_cannot_update_payment_records" ON public.payment_records
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);

-- Customers cannot DELETE payment records (admin only)
CREATE POLICY "customers_cannot_delete_payment_records" ON public.payment_records
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
  )
);