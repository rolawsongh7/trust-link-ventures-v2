-- Add database-level protection to prevent customer/quote changes for existing orders

CREATE OR REPLACE FUNCTION public.prevent_order_relationship_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent changing customer_id for existing orders
  IF OLD.customer_id IS NOT NULL AND NEW.customer_id != OLD.customer_id THEN
    RAISE EXCEPTION 'Cannot change customer for existing order. Customer is locked after order creation.';
  END IF;
  
  -- Prevent changing quote_id for existing orders
  IF OLD.quote_id IS NOT NULL AND NEW.quote_id != OLD.quote_id THEN
    RAISE EXCEPTION 'Cannot change related quote for existing order. Quote relationship is locked after order creation.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce relationship locks
DROP TRIGGER IF EXISTS prevent_order_relationship_changes_trigger ON public.orders;

CREATE TRIGGER prevent_order_relationship_changes_trigger
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_order_relationship_changes();