-- Phase 1: Add delivery_window column and enforce delivery information requirements

-- Add delivery_window column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_window TEXT;

-- Update validate_order_status_transition function to enforce delivery requirements for 'shipped' status
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "order_confirmed": ["pending_payment", "cancelled"],
    "pending_payment": ["payment_received", "cancelled"],
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
  -- Allow initial status setting
  IF OLD.status IS NULL THEN
    IF NEW.status NOT IN ('order_confirmed', 'pending_payment', 'payment_received') THEN
      RAISE EXCEPTION 'Invalid initial order status: %. Must be one of: order_confirmed, pending_payment, payment_received', NEW.status
        USING HINT = 'New orders should start with order_confirmed, pending_payment, or payment_received';
    END IF;
    RETURN NEW;
  END IF;
  
  -- Allow status to remain unchanged
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Check if transition is valid
  allowed_next_statuses := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions->OLD.status)
  );

  IF NOT (NEW.status = ANY(allowed_next_statuses)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %. Current status: %. Allowed next statuses: %',
      OLD.status, NEW.status, OLD.status, array_to_string(allowed_next_statuses, ', ')
      USING HINT = format('To move from %s, you can only change to: %s. Contact support if you need to force a status change.', 
                          OLD.status, array_to_string(allowed_next_statuses, ', '));
  END IF;
  
  -- Enforce delivery information requirements for 'shipped' status
  IF NEW.status = 'shipped' THEN
    IF NEW.carrier IS NULL OR trim(NEW.carrier) = '' THEN
      RAISE EXCEPTION 'Cannot mark order as shipped without a carrier. Please provide carrier information.'
        USING HINT = 'Set the carrier (e.g., DHL, FedEx, UPS) before marking as shipped';
    END IF;
    
    IF NEW.tracking_number IS NULL OR trim(NEW.tracking_number) = '' THEN
      RAISE EXCEPTION 'Cannot mark order as shipped without a tracking number. Please provide tracking number.'
        USING HINT = 'Set the tracking number before marking as shipped';
    END IF;
    
    IF NEW.estimated_delivery_date IS NULL THEN
      RAISE EXCEPTION 'Cannot mark order as shipped without an estimated delivery date. Please provide estimated delivery date.'
        USING HINT = 'Set the estimated delivery date before marking as shipped';
    END IF;
  END IF;
  
  -- Additional validations for specific transitions
  IF NEW.status IN ('ready_to_ship', 'shipped') AND NEW.delivery_address_id IS NULL THEN
    RAISE EXCEPTION 'Cannot transition to % without a delivery address. Please request and confirm delivery address first.', NEW.status
      USING HINT = 'Use the "Request Delivery Address" button to ask the customer for their address.';
  END IF;

  -- Log successful transition
  PERFORM log_security_event(
    'order_status_transition',
    auth.uid(),
    jsonb_build_object(
      'order_id', NEW.id,
      'order_number', NEW.order_number,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'transition_valid', true
    ),
    NULL,
    NULL,
    'low'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;