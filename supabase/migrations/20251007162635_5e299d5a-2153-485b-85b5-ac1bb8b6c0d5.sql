-- Fix ambiguous column reference in generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_number TEXT;
  counter INTEGER;
BEGIN
  -- Qualify the column name to avoid ambiguity
  SELECT COALESCE(MAX(CAST(SUBSTRING(orders.order_number FROM 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM orders
  WHERE orders.order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
  
  order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN order_number;
END;
$function$;