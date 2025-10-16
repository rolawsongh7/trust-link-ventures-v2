-- Fix auto_convert_quote_to_order to use customer_id instead of auth.uid()
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

      -- Log successful conversion
      v_error_context := 'Logging conversion audit';
      PERFORM log_security_event(
        'quote_converted_to_order',
        NEW.customer_id,
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

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Orders can be created by authorized users or system" ON orders;

-- Create improved INSERT policy
CREATE POLICY "Orders can be created by authorized users or system"
ON orders FOR INSERT
WITH CHECK (
  (auth.uid() = customer_id) OR
  (check_user_role(auth.uid(), 'admin')) OR
  (created_by = customer_id AND customer_id IS NOT NULL)
);