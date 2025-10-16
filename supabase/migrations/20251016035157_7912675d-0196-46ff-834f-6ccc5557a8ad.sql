-- Remove the problematic trigger that uses net schema
DROP TRIGGER IF EXISTS auto_generate_invoices_trigger ON orders;

-- Recreate the function without net.http_post calls
CREATE OR REPLACE FUNCTION public.auto_generate_invoices_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log invoice generation events instead of calling HTTP endpoints
  -- The actual invoice generation will be handled by edge functions called from the frontend
  
  -- Generate Packing List when order becomes ready_to_ship
  IF NEW.status = 'ready_to_ship' AND (OLD.status IS NULL OR OLD.status != 'ready_to_ship') THEN
    PERFORM log_security_event(
      'packing_list_requested',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'auto_triggered', true
      )
    );
  END IF;
  
  -- Generate Commercial Invoice when order is shipped
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    PERFORM log_security_event(
      'commercial_invoice_requested',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'auto_triggered', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER auto_generate_invoices_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invoices_on_status_change();