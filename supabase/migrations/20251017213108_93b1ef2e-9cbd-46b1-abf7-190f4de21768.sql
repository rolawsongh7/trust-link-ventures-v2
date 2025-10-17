-- Phase 1: Data Integrity - Add currency constraints and validation

-- Step 1: Set default currency for existing NULL values
UPDATE quotes SET currency = 'USD' WHERE currency IS NULL;
UPDATE orders SET currency = 'USD' WHERE currency IS NULL;

-- Step 2: Add NOT NULL constraints with defaults
ALTER TABLE quotes 
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN currency SET NOT NULL;

ALTER TABLE orders 
  ALTER COLUMN currency SET DEFAULT 'USD',
  ALTER COLUMN currency SET NOT NULL;

-- Step 3: Create function to prevent currency changes after certain statuses
CREATE OR REPLACE FUNCTION prevent_currency_change_on_quotes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent currency changes on quotes that are sent or accepted
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    IF OLD.status IN ('sent', 'accepted') THEN
      RAISE EXCEPTION 'Cannot change currency on quote % with status %. Currency is locked after quote is sent.', 
        OLD.quote_number, OLD.status
        USING HINT = 'Create a new quote if you need to change the currency';
    END IF;
    
    -- Log the currency change
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
$$;

-- Step 4: Create trigger for quote currency protection
DROP TRIGGER IF EXISTS prevent_quote_currency_change ON quotes;
CREATE TRIGGER prevent_quote_currency_change
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION prevent_currency_change_on_quotes();

-- Step 5: Create function to prevent currency changes on orders after payment
CREATE OR REPLACE FUNCTION prevent_currency_change_on_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Prevent currency changes on orders beyond pending_payment
  IF OLD.currency IS DISTINCT FROM NEW.currency THEN
    IF OLD.status NOT IN ('order_confirmed', 'pending_payment') THEN
      RAISE EXCEPTION 'Cannot change currency on order % with status %. Currency is locked after payment is received.', 
        OLD.order_number, OLD.status
        USING HINT = 'Currency can only be changed on orders with status order_confirmed or pending_payment';
    END IF;
    
    -- Check if any invoices exist for this order
    IF EXISTS (SELECT 1 FROM invoices WHERE order_id = NEW.id) THEN
      RAISE EXCEPTION 'Cannot change currency on order % because invoices have already been generated.', 
        OLD.order_number
        USING HINT = 'Delete existing invoices before changing currency, or create a new order';
    END IF;
    
    -- Log the currency change
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
$$;

-- Step 6: Create trigger for order currency protection
DROP TRIGGER IF EXISTS prevent_order_currency_change ON orders;
CREATE TRIGGER prevent_order_currency_change
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_currency_change_on_orders();

-- Step 7: Update auto_convert_quote_to_order to ensure currency is always set
CREATE OR REPLACE FUNCTION public.auto_convert_quote_to_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  order_id UUID;
  quote_item RECORD;
  v_error_context TEXT;
  v_quote_currency TEXT;
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
      
      -- CRITICAL: Ensure currency is set (fail-fast if missing)
      v_quote_currency := COALESCE(NEW.currency, 'USD');
      IF NEW.currency IS NULL THEN
        RAISE WARNING 'Quote % has NULL currency, defaulting to USD. This should not happen.', NEW.quote_number;
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
        v_quote_currency, -- Use validated currency
        'pending_payment',
        'Auto-generated from accepted quote: ' || NEW.quote_number,
        NEW.customer_id
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

      -- Log successful conversion with currency tracking
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
      -- Log the error with context
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
      
      -- Re-raise the exception to rollback the transaction
      RAISE EXCEPTION 'Failed to convert quote % to order at step "%": %', 
        NEW.quote_number, v_error_context, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;