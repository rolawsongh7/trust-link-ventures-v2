-- Continue fixing Function Search Path Mutable security issue (Part 2)
-- Add SET search_path to remaining functions

-- 8. auto_convert_quote_to_order
CREATE OR REPLACE FUNCTION public.auto_convert_quote_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  order_id UUID;
  quote_item RECORD;
  v_error_context TEXT;
  v_quote_currency TEXT;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    
    BEGIN
      IF EXISTS (SELECT 1 FROM orders WHERE quote_id = NEW.id) THEN
        RAISE NOTICE 'Order already exists for quote %, skipping duplicate creation', NEW.quote_number;
        RETURN NEW;
      END IF;
      
      IF NEW.customer_id IS NULL THEN
        RAISE EXCEPTION 'Cannot create order: quote has no customer_id';
      END IF;
      
      IF NOT EXISTS (SELECT 1 FROM quote_items WHERE quote_id = NEW.id) THEN
        RAISE EXCEPTION 'Cannot create order: quote % has no line items', NEW.quote_number;
      END IF;
      
      v_quote_currency := COALESCE(NEW.currency, 'USD');
      IF NEW.currency IS NULL THEN
        RAISE WARNING 'Quote % has NULL currency, defaulting to USD. This should not happen.', NEW.quote_number;
      END IF;
      
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
        v_quote_currency,
        'pending_payment',
        'Auto-generated from accepted quote: ' || NEW.quote_number,
        NEW.customer_id
      ) RETURNING id INTO order_id;

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

      v_error_context := 'Logging conversion audit';
      PERFORM log_security_event(
        'quote_converted_to_order',
        NEW.customer_id,
        jsonb_build_object(
          'quote_id', NEW.id,
          'order_id', order_id,
          'quote_number', NEW.quote_number,
          'total_amount', NEW.total_amount,
          'currency', v_quote_currency,
          'currency_source', CASE WHEN NEW.currency IS NULL THEN 'defaulted' ELSE 'from_quote' END
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      PERFORM log_security_event(
        'quote_conversion_failed',
        NEW.customer_id,
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
      
      RAISE EXCEPTION 'Failed to convert quote % to order at step "%": %', 
        NEW.quote_number, v_error_context, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 9. validate_order_status_transition
CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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
  IF OLD.status IS NULL THEN
    IF NEW.status NOT IN ('order_confirmed', 'pending_payment', 'payment_received') THEN
      RAISE EXCEPTION 'Invalid initial order status: %. Must be one of: order_confirmed, pending_payment, payment_received', NEW.status
        USING HINT = 'New orders should start with order_confirmed, pending_payment, or payment_received';
    END IF;
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  allowed_next_statuses := ARRAY(
    SELECT jsonb_array_elements_text(valid_transitions->OLD.status::text)
  );

  IF NOT (NEW.status::text = ANY(allowed_next_statuses)) THEN
    RAISE EXCEPTION 'Invalid order status transition: % → %. Current status: %. Allowed next statuses: %',
      OLD.status, NEW.status, OLD.status, array_to_string(allowed_next_statuses, ', ')
      USING HINT = format('To move from %s, you can only change to: %s. Contact support if you need to force a status change.', 
                          OLD.status, array_to_string(allowed_next_statuses, ', '));
  END IF;
  
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
  
  IF NEW.status IN ('ready_to_ship', 'shipped') AND NEW.delivery_address_id IS NULL THEN
    RAISE EXCEPTION 'Cannot transition to % without a delivery address. Please request and confirm delivery address first.', NEW.status
      USING HINT = 'Use the "Request Delivery Address" button to ask the customer for their address.';
  END IF;

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

-- 10. auto_link_quote_to_customer
CREATE OR REPLACE FUNCTION public.auto_link_quote_to_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  matched_customer_id UUID;
BEGIN
  IF NEW.customer_id IS NULL AND NEW.customer_email IS NOT NULL THEN
    SELECT id INTO matched_customer_id
    FROM customers
    WHERE LOWER(email) = LOWER(NEW.customer_email)
    LIMIT 1;
    
    IF matched_customer_id IS NOT NULL THEN
      NEW.customer_id := matched_customer_id;
      
      PERFORM log_security_event(
        'quote_auto_linked_to_customer',
        auth.uid(),
        jsonb_build_object(
          'quote_id', NEW.id,
          'quote_number', NEW.quote_number,
          'customer_id', matched_customer_id,
          'customer_email', NEW.customer_email,
          'auto_linked', true
        ),
        NULL,
        NULL,
        'low'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 11. log_table_changes
CREATE OR REPLACE FUNCTION public.log_table_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  changed_fields jsonb := '{}'::jsonb;
  field_name text;
  severity_level text := 'low';
BEGIN
  IF TG_OP = 'DELETE' THEN
    severity_level := 'high';
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'orders' THEN
      IF OLD.total_amount != NEW.total_amount OR OLD.status != NEW.status THEN
        severity_level := 'medium';
      END IF;
    ELSIF TG_TABLE_NAME = 'quotes' THEN
      IF OLD.status != NEW.status THEN
        severity_level := 'medium';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOR field_name IN 
      SELECT column_name::text 
      FROM information_schema.columns 
      WHERE table_schema = TG_TABLE_SCHEMA 
        AND table_name = TG_TABLE_NAME
        AND column_name NOT IN ('updated_at', 'created_at')
    LOOP
      EXECUTE format('
        SELECT CASE 
          WHEN ($1).%I IS DISTINCT FROM ($2).%I 
          THEN jsonb_build_object(
            ''old'', to_jsonb(($1).%I), 
            ''new'', to_jsonb(($2).%I)
          )
          ELSE NULL
        END', 
        field_name, field_name, field_name, field_name
      ) INTO changed_fields USING OLD, NEW;
      
      IF changed_fields IS NOT NULL THEN
        EXIT;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO audit_logs (
    user_id,
    event_type,
    action,
    resource_type,
    resource_id,
    event_data,
    changes,
    severity,
    created_at
  ) VALUES (
    auth.uid(),
    'data_change',
    TG_OP,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    END,
    changed_fields,
    severity_level,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;