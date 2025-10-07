-- Phase 1: Add delivery address validation checkpoint

-- Create validation function to prevent shipping without delivery address
CREATE OR REPLACE FUNCTION public.validate_delivery_address_before_shipping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If transitioning to ready_to_ship or shipped, validate delivery address
  IF NEW.status IN ('ready_to_ship', 'shipped') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ready_to_ship', 'shipped')) THEN
    
    -- Check if delivery_address_id exists
    IF NEW.delivery_address_id IS NULL THEN
      RAISE EXCEPTION 'Cannot mark order as % without a confirmed delivery address. Please request delivery address from customer first.', NEW.status;
    END IF;
    
    -- Validate that the address actually exists and belongs to the customer
    IF NOT EXISTS (
      SELECT 1 FROM customer_addresses 
      WHERE id = NEW.delivery_address_id
      AND customer_id = NEW.customer_id
    ) THEN
      RAISE EXCEPTION 'Invalid delivery address ID or address does not belong to customer';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce delivery address validation
DROP TRIGGER IF EXISTS enforce_delivery_address_on_shipping ON public.orders;
CREATE TRIGGER enforce_delivery_address_on_shipping
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_delivery_address_before_shipping();

-- Add helper columns to track delivery address workflow
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS delivery_address_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS delivery_address_confirmed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.orders.delivery_address_requested_at IS 'Timestamp when admin requested delivery address from customer';
COMMENT ON COLUMN public.orders.delivery_address_confirmed_at IS 'Timestamp when customer provided/confirmed delivery address';