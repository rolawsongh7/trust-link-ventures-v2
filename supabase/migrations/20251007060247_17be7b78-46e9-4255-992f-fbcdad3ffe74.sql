-- Fix the auto_convert_quote_to_order function to use correct order status
CREATE OR REPLACE FUNCTION public.auto_convert_quote_to_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  order_id UUID;
  quote_item RECORD;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
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
      'pending_payment',  -- Changed from 'pending' to 'pending_payment'
      'Auto-generated from accepted quote: ' || NEW.quote_number,
      auth.uid()
    ) RETURNING id INTO order_id;

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

    PERFORM log_security_event(
      'quote_converted_to_order',
      auth.uid(),
      jsonb_build_object(
        'quote_id', NEW.id,
        'order_id', order_id,
        'quote_number', NEW.quote_number
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;