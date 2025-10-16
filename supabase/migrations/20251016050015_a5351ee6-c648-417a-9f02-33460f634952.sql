-- Re-enable automatic commercial invoice generation when orders are shipped
-- This trigger was previously disabled, now we're adding it back with better error handling

CREATE OR REPLACE FUNCTION public.auto_generate_commercial_invoice_on_ship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes to 'shipped'
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    
    -- Check if commercial invoice already exists
    IF NOT EXISTS (
      SELECT 1 FROM invoices 
      WHERE order_id = NEW.id 
      AND invoice_type = 'commercial'
    ) THEN
      
      -- Log the trigger event for monitoring
      PERFORM log_security_event(
        'commercial_invoice_auto_trigger',
        auth.uid(),
        jsonb_build_object(
          'order_id', NEW.id,
          'order_number', NEW.order_number,
          'triggered_at', now()
        ),
        NULL,
        NULL,
        'low'
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_generate_commercial_invoice_on_ship_trigger ON orders;

-- Create the trigger
CREATE TRIGGER auto_generate_commercial_invoice_on_ship_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_commercial_invoice_on_ship();

COMMENT ON FUNCTION public.auto_generate_commercial_invoice_on_ship() IS 
'Automatically logs when an order is shipped so commercial invoice can be generated. The actual PDF generation happens via edge function to avoid long-running database operations.';