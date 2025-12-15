-- Create trigger function to sync invoice status with order payment status
CREATE OR REPLACE FUNCTION sync_invoice_status_with_order()
RETURNS TRIGGER AS $$
BEGIN
  -- When order receives payment, mark commercial invoices as paid
  IF NEW.status IN ('payment_received', 'processing', 'ready_to_ship', 'shipped', 'delivered') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('payment_received', 'processing', 'ready_to_ship', 'shipped', 'delivered')) THEN
    
    UPDATE invoices
    SET status = 'paid',
        paid_at = COALESCE(paid_at, NOW())
    WHERE order_id = NEW.id
    AND invoice_type = 'commercial'
    AND status != 'paid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create the trigger on orders table
DROP TRIGGER IF EXISTS sync_invoice_status_on_order_update ON orders;
CREATE TRIGGER sync_invoice_status_on_order_update
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION sync_invoice_status_with_order();

-- Fix existing invoices where order has received payment but invoice is still 'sent'
UPDATE invoices
SET status = 'paid', 
    paid_at = COALESCE(paid_at, NOW())
WHERE invoice_type = 'commercial'
AND status = 'sent'
AND order_id IN (
  SELECT id FROM orders 
  WHERE status IN ('payment_received', 'processing', 'ready_to_ship', 'shipped', 'delivered')
);