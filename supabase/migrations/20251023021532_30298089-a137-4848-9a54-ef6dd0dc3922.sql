-- Fix Function Search Path Mutable security issue
-- Add SET search_path to all functions missing this critical security parameter

-- 1. update_virtual_assistant_updated_at
CREATE OR REPLACE FUNCTION public.update_virtual_assistant_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. prevent_currency_change_on_quotes
CREATE OR REPLACE FUNCTION public.prevent_currency_change_on_quotes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    IF OLD.status IN ('sent', 'accepted') THEN
      RAISE EXCEPTION 'Cannot change currency on quote % with status %. Currency is locked after quote is sent.', 
        OLD.quote_number, OLD.status
        USING HINT = 'Create a new quote if you need to change the currency';
    END IF;
    
    PERFORM log_security_event(
      'quote_currency_changed',
      auth.uid(),
      jsonb_build_object(
        'quote_id', NEW.id,
        'quote_number', NEW.quote_number,
        'old_currency', OLD.currency,
        'new_currency', NEW.currency,
        'status', NEW.status
      ),
      NULL,
      NULL,
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. auto_generate_quote_title
CREATE OR REPLACE FUNCTION public.auto_generate_quote_title()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  customer_name TEXT;
  item_count INTEGER;
  generated_title TEXT;
BEGIN
  IF NEW.title IS NULL OR trim(NEW.title) = '' THEN
    SELECT company_name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id
    LIMIT 1;
    
    IF customer_name IS NULL AND NEW.customer_email IS NOT NULL THEN
      customer_name := split_part(NEW.customer_email, '@', 1);
    END IF;
    
    SELECT COUNT(*) INTO item_count
    FROM quote_items
    WHERE quote_id = NEW.id;
    
    IF item_count > 0 AND customer_name IS NOT NULL THEN
      generated_title := item_count || ' Items - ' || customer_name;
    ELSIF customer_name IS NOT NULL THEN
      generated_title := 'Quote for ' || customer_name;
    ELSE
      generated_title := 'Quote ' || NEW.quote_number;
    END IF;
    
    NEW.title := generated_title;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. validate_address_completeness
CREATE OR REPLACE FUNCTION public.validate_address_completeness()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
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

  IF NEW.region NOT IN (
    'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
    'Northern', 'Upper East', 'Upper West', 'Volta', 'Bono',
    'Bono East', 'Ahafo', 'Oti', 'Savannah', 'North East', 'Western North'
  ) THEN
    RAISE EXCEPTION 'Invalid Ghana region: %', NEW.region;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. auto_create_rfq_if_needed
CREATE OR REPLACE FUNCTION public.auto_create_rfq_if_needed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  requires_rfq BOOLEAN := FALSE;
BEGIN
  IF NEW.origin_type = 'rfq' OR NEW.total_amount > 10000 THEN
    requires_rfq := TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM quote_items 
    WHERE quote_id = NEW.id 
    AND (specifications ILIKE '%custom%' OR specifications ILIKE '%special%')
  ) THEN
    requires_rfq := TRUE;
  END IF;

  IF requires_rfq AND NOT EXISTS (SELECT 1 FROM rfqs WHERE quote_id = NEW.id) THEN
    INSERT INTO rfqs (
      quote_id,
      title,
      description,
      deadline,
      created_by
    ) VALUES (
      NEW.id,
      'RFQ for Quote: ' || NEW.quote_number,
      NEW.description || CASE 
        WHEN NEW.total_amount > 10000 THEN ' (High value quote requiring supplier input)'
        ELSE ' (Custom specifications requiring supplier input)'
      END,
      CURRENT_DATE + INTERVAL '7 days',
      auth.uid()
    );

    IF NEW.origin_type != 'rfq' THEN
      UPDATE quotes SET origin_type = 'rfq' WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 6. prevent_currency_change_on_orders
CREATE OR REPLACE FUNCTION public.prevent_currency_change_on_orders()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    IF OLD.status NOT IN ('order_confirmed', 'pending_payment') THEN
      RAISE EXCEPTION 'Cannot change currency on order % with status %. Currency is locked after payment is received.', 
        OLD.order_number, OLD.status
        USING HINT = 'Currency can only be changed on orders with status order_confirmed or pending_payment';
    END IF;
    
    IF EXISTS (SELECT 1 FROM invoices WHERE order_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot change currency on order % because invoices have already been generated.', 
        OLD.order_number
        USING HINT = 'Delete existing invoices before changing currency, or create a new order';
    END IF;
    
    PERFORM log_security_event(
      'order_currency_changed',
      auth.uid(),
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_currency', OLD.currency,
        'new_currency', NEW.currency,
        'status', NEW.status
      ),
      NULL,
      NULL,
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 7. update_order_status_timestamps
CREATE OR REPLACE FUNCTION public.update_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status::text = 'payment_received' AND (OLD.status IS NULL OR OLD.status::text != 'payment_received') THEN
    NEW.payment_confirmed_at = NOW();
  END IF;
  
  IF NEW.status::text = 'processing' AND (OLD.status IS NULL OR OLD.status::text != 'processing') THEN
    NEW.processing_started_at = NOW();
  END IF;
  
  IF NEW.status::text = 'ready_to_ship' AND (OLD.status IS NULL OR OLD.status::text != 'ready_to_ship') THEN
    NEW.ready_to_ship_at = NOW();
  END IF;
  
  IF NEW.status::text = 'shipped' AND (OLD.status IS NULL OR OLD.status::text != 'shipped') THEN
    NEW.shipped_at = NOW();
  END IF;
  
  IF NEW.status::text = 'delivered' AND (OLD.status IS NULL OR OLD.status::text != 'delivered') THEN
    NEW.delivered_at = NOW();
  END IF;
  
  IF NEW.status::text = 'cancelled' AND (OLD.status IS NULL OR OLD.status::text != 'cancelled') THEN
    NEW.cancelled_at = NOW();
  END IF;
  
  IF NEW.status::text = 'delivery_failed' AND (OLD.status IS NULL OR OLD.status::text != 'delivery_failed') THEN
    NEW.failed_delivery_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;