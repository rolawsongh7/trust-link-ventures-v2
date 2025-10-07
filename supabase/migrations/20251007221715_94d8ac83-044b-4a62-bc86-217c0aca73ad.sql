-- Phase 2: Create automatic invoice generation triggers

-- Create storage bucket for invoices
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for invoices bucket
CREATE POLICY "Service role can insert invoices"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Admins can read all invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND check_user_role(auth.uid(), 'admin')
);

CREATE POLICY "Customers can read their own invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    -- Extract customer_id from path: invoices/{type}/{invoice_number}.pdf
    -- Match against invoices table
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.invoice_number = split_part(name, '/', 2)
      AND invoices.customer_id IN (
        SELECT id FROM customers WHERE email = (auth.jwt() ->> 'email')
      )
    )
  )
);

-- Function to automatically generate invoices when order status changes
CREATE OR REPLACE FUNCTION auto_generate_invoices_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url TEXT;
  supabase_url TEXT;
BEGIN
  supabase_url := current_setting('app.settings.supabase_url', true);
  
  -- Generate Packing List when order becomes ready_to_ship
  IF NEW.status = 'ready_to_ship' AND (OLD.status IS NULL OR OLD.status != 'ready_to_ship') THEN
    function_url := supabase_url || '/functions/v1/generate-packing-list';
    
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('orderId', NEW.id)
    );
    
    PERFORM log_security_event(
      'packing_list_generated',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number
      )
    );
  END IF;
  
  -- Generate Commercial Invoice when order is shipped
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    function_url := supabase_url || '/functions/v1/generate-commercial-invoice';
    
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('orderId', NEW.id)
    );
    
    PERFORM log_security_event(
      'commercial_invoice_generated',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS order_status_invoice_trigger ON orders;
CREATE TRIGGER order_status_invoice_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status IN ('ready_to_ship', 'shipped'))
  EXECUTE FUNCTION auto_generate_invoices_on_status_change();