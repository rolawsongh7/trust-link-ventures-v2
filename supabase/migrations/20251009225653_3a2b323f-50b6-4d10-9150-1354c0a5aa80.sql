-- Phase 1: Enhanced Order Creation with Error Handling
CREATE OR REPLACE FUNCTION public.auto_convert_quote_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  order_id UUID;
  quote_item RECORD;
  v_error_context TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    BEGIN
      -- Check for existing order (prevent duplicates)
      IF EXISTS (SELECT 1 FROM orders WHERE quote_id = NEW.id) THEN
        RAISE NOTICE 'Order already exists for quote %, skipping duplicate creation', NEW.quote_number;
        RETURN NEW;
      END IF;
      
      -- Validate customer exists
      IF NEW.customer_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create order: quote has no customer_id';
      END IF;
      
      -- Validate quote has items
      IF NOT EXISTS (SELECT 1 FROM quote_items WHERE quote_id = NEW.id) THEN
        RAISE EXCEPTION 'Cannot create order: quote % has no line items', NEW.quote_number;
      END IF;
      
      -- Create order with error context
      v_error_context := 'Creating order record';
      INSERT INTO orders (
        quote_id,
        customer_id,
        order_number,
        total_amount,
        currency,
        status,
        notes,
        created_by
      ) VALUES (
        NEW.id,
        NEW.customer_id,
        generate_order_number(),
        NEW.total_amount,
        NEW.currency,
        'pending_payment',
        'Auto-generated from accepted quote: ' || NEW.quote_number,
        auth.uid()
      ) RETURNING id INTO order_id;

      -- Copy quote items to order items
      v_error_context := 'Copying quote items to order';
      FOR quote_item IN 
        SELECT * FROM quote_items WHERE quote_id = NEW.id
      LOOP
        INSERT INTO order_items (
          order_id,
          product_name,
          product_description,
          quantity,
          unit,
          unit_price,
          total_price,
          specifications
        ) VALUES (
          order_id,
          quote_item.product_name,
          quote_item.product_description,
          quote_item.quantity,
          quote_item.unit,
          quote_item.unit_price,
          quote_item.total_price,
          quote_item.specifications
        );
      END LOOP;

      -- Log successful conversion
      v_error_context := 'Logging conversion audit';
      PERFORM log_security_event(
        'quote_converted_to_order',
        auth.uid(),
        jsonb_build_object(
          'quote_id', NEW.id,
          'order_id', order_id,
          'quote_number', NEW.quote_number,
          'total_amount', NEW.total_amount,
          'currency', NEW.currency
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error with context
      PERFORM log_security_event(
        'quote_conversion_failed',
        auth.uid(),
        jsonb_build_object(
          'quote_id', NEW.id,
          'quote_number', NEW.quote_number,
          'error_message', SQLERRM,
          'error_context', v_error_context,
          'error_detail', SQLSTATE
        ),
        NULL,
        NULL,
        'high'
      );
      
      -- Re-raise the exception to rollback the transaction
      RAISE EXCEPTION 'Failed to convert quote % to order at step "%": %', 
        NEW.quote_number, v_error_context, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- Phase 2: Address Validation
CREATE OR REPLACE FUNCTION validate_address_completeness()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure all required fields are filled
  IF NEW.receiver_name IS NULL OR trim(NEW.receiver_name) = '' THEN
    RAISE EXCEPTION 'Receiver name is required';
  END IF;

  IF NEW.phone_number IS NULL OR trim(NEW.phone_number) = '' THEN
    RAISE EXCEPTION 'Phone number is required';
  END IF;

  IF NEW.ghana_digital_address IS NULL OR trim(NEW.ghana_digital_address) = '' THEN
    RAISE EXCEPTION 'Ghana Digital Address is required';
  END IF;

  IF NEW.region IS NULL OR trim(NEW.region) = '' THEN
    RAISE EXCEPTION 'Region is required';
  END IF;

  IF NEW.city IS NULL OR trim(NEW.city) = '' THEN
    RAISE EXCEPTION 'City is required';
  END IF;

  IF NEW.street_address IS NULL OR trim(NEW.street_address) = '' THEN
    RAISE EXCEPTION 'Street address is required';
  END IF;

  -- Validate Ghana regions
  IF NEW.region NOT IN (
    'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
    'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
    'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North'
  ) THEN
    RAISE EXCEPTION 'Invalid Ghana region: %', NEW.region;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_address_before_insert_or_update ON customer_addresses;
CREATE TRIGGER validate_address_before_insert_or_update
  BEFORE INSERT OR UPDATE ON customer_addresses
  FOR EACH ROW
  EXECUTE FUNCTION validate_address_completeness();

-- Phase 3: Enhanced Status Validation
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Add emergency admin override function
CREATE OR REPLACE FUNCTION public.force_order_status_change(
  p_order_id UUID,
  p_new_status TEXT,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_status TEXT;
  v_order_number TEXT;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can force status changes';
  END IF;

  -- Get current order info
  SELECT status, order_number INTO v_old_status, v_order_number
  FROM orders
  WHERE id = p_order_id;

  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Log the forced change (high severity)
  PERFORM log_security_event(
    'order_status_forced',
    p_admin_id,
    jsonb_build_object(
      'order_id', p_order_id,
      'order_number', v_order_number,
      'old_status', v_old_status,
      'new_status', p_new_status,
      'reason', p_reason,
      'forced_by_admin', true
    ),
    NULL,
    NULL,
    'high'
  );

  -- Disable trigger temporarily
  ALTER TABLE orders DISABLE TRIGGER validate_order_status_transition_trigger;

  -- Update status
  UPDATE orders
  SET status = p_new_status,
      notes = COALESCE(notes, '') || format(
        E'\n\n[FORCED STATUS CHANGE %s]: %s → %s by admin. Reason: %s',
        to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
        v_old_status,
        p_new_status,
        p_reason
      )
  WHERE id = p_order_id;

  -- Re-enable trigger
  ALTER TABLE orders ENABLE TRIGGER validate_order_status_transition_trigger;

  RETURN jsonb_build_object(
    'success', true,
    'order_number', v_order_number,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'message', 'Status forcefully changed'
  );
END;
$function$;