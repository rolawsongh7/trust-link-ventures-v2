-- Drop and recreate get_order_by_tracking_token to include delivery_window
DROP FUNCTION IF EXISTS public.get_order_by_tracking_token(text);

CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token(p_token text)
RETURNS TABLE(
  order_id uuid,
  order_number text,
  status text,
  tracking_number text,
  carrier text,
  estimated_delivery_date date,
  actual_delivery_date date,
  created_at timestamp with time zone,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  delivery_notes text,
  delivery_window text,
  customer_name text,
  delivery_address text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Update last accessed
  UPDATE delivery_tracking_tokens 
  SET last_accessed_at = now() 
  WHERE token = p_token AND expires_at > now();

  -- Return order details with delivery_window
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.status::TEXT,
    o.tracking_number,
    o.carrier,
    o.estimated_delivery_date,
    o.actual_delivery_date,
    o.created_at,
    o.shipped_at,
    o.delivered_at,
    o.delivery_notes,
    o.delivery_window,
    c.company_name,
    CONCAT(
      ca.street_address, ', ',
      COALESCE(ca.area, ''), ', ',
      ca.city, ', ',
      ca.region, ' - ',
      ca.ghana_digital_address
    )
  FROM delivery_tracking_tokens dtt
  JOIN orders o ON o.id = dtt.order_id
  LEFT JOIN customers c ON c.id = o.customer_id
  LEFT JOIN customer_addresses ca ON ca.id = o.delivery_address_id
  WHERE dtt.token = p_token 
    AND dtt.expires_at > now()
  LIMIT 1;
END;
$function$;