-- Fix order status transitions to support partial payment workflow
-- This allows orders with partial payments to move to processing
-- while blocking shipping until fully paid

CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  valid_transitions jsonb := '{
    "order_confirmed": ["pending_payment", "cancelled"],
    "pending_payment": ["payment_received", "processing", "cancelled"],
    "payment_received": ["processing", "cancelled"],
    "processing": ["ready_to_ship", "cancelled"],
    "ready_to_ship": ["shipped", "cancelled"],
    "shipped": ["delivered", "delivery_failed"],
    "delivered": [],
    "cancelled": [],
    "delivery_failed": ["shipped"]
  }'::jsonb;
  allowed_next_statuses text[];
BEGIN
  -- Initial status validation
  IF OLD.status IS NULL THEN
    IF NEW.status NOT IN ('order_confirmed', 'pending_payment', 'payment_received') THEN
      RAISE EXCEPTION 'Invalid initial order status: %. Must be one of: order_confirmed, pending_payment, payment_received', NEW.status
        USING HINT = 'New orders should start with order_confirmed, pending_payment, or payment_received';
    END IF;
    RETURN NEW;
  END IF;
  
  -- No change = no validation needed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get allowed transitions
  allowed_next_statuses := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions->OLD.status::text)
  );

  -- Check if transition is valid
  IF NOT (NEW.status::text = ANY(allowed_next_statuses)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %. Allowed: %',
      OLD.status, NEW.status, array_to_string(allowed_next_statuses, ', ')
      USING HINT = format('Contact support if you need to force a status change.');
  END IF;
  
  -- PARTIAL PAYMENT GUARD: pending_payment → processing requires at least deposit
  IF OLD.status = 'pending_payment' AND NEW.status = 'processing' THEN
    IF NEW.payment_status IS NULL OR NEW.payment_status::text = 'unpaid' THEN
      RAISE EXCEPTION 'Cannot start processing without verified payment. Verify at least a deposit first.'
        USING HINT = 'Use "Verify Payment" to confirm the deposit before processing.';
    END IF;
  END IF;
  
  -- SHIPPING GUARD: Block shipping without full payment
  IF NEW.status IN ('ready_to_ship', 'shipped') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ready_to_ship', 'shipped')) THEN
    
    -- Check payment status
    IF NEW.payment_status IS NULL OR NEW.payment_status::text NOT IN ('fully_paid', 'overpaid') THEN
      RAISE EXCEPTION 'Cannot ship until fully paid. Current: %, Balance: %', 
        COALESCE(NEW.payment_status::text, 'unpaid'),
        COALESCE(NEW.balance_remaining, NEW.total_amount)
        USING HINT = 'Collect the remaining balance before marking as ready to ship.';
    END IF;
    
    -- Check delivery address
    IF NEW.delivery_address_id IS NULL THEN
      RAISE EXCEPTION 'Cannot ship without delivery address. Request address first.'
        USING HINT = 'Use "Request Delivery Address" to get the customer address.';
    END IF;
  END IF;
  
  -- SHIPPED validation: carrier and tracking required
  IF NEW.status = 'shipped' THEN
    IF NEW.carrier IS NULL OR trim(NEW.carrier) = '' THEN
      RAISE EXCEPTION 'Cannot ship without carrier information.'
        USING HINT = 'Set carrier (e.g., DHL, FedEx) before marking as shipped.';
    END IF;
    
    IF NEW.tracking_number IS NULL OR trim(NEW.tracking_number) = '' THEN
      RAISE EXCEPTION 'Cannot ship without tracking number.'
        USING HINT = 'Set tracking number before marking as shipped.';
    END IF;
    
    IF NEW.estimated_delivery_date IS NULL THEN
      RAISE EXCEPTION 'Cannot ship without estimated delivery date.'
        USING HINT = 'Set estimated delivery date before marking as shipped.';
    END IF;
  END IF;

  -- Log the transition (only if log_security_event exists)
  BEGIN
    PERFORM log_security_event(
      'order_status_transition',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'payment_status', NEW.payment_status,
        'transition_valid', true
      ),
      NULL,
      NULL,
      'low'
    );
  EXCEPTION WHEN undefined_function THEN
    -- log_security_event doesn't exist, skip logging
    NULL;
  END;
  
  RETURN NEW;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.validate_order_status_transition() IS 
'Validates order status transitions with payment-aware guards:
- pending_payment → processing: requires at least partial payment
- ready_to_ship/shipped: requires full payment and delivery address
- shipped: requires carrier, tracking, and estimated delivery';