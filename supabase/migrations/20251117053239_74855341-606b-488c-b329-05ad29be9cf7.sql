-- Step 2: Backfill missing tracking tokens and improve RPC function
-- Step 10: Update RPC function with better error handling

-- Backfill tracking tokens for all shipped orders that don't have tokens
INSERT INTO delivery_tracking_tokens (order_id)
SELECT id 
FROM orders 
WHERE status IN ('shipped', 'delivered')
  AND id NOT IN (SELECT order_id FROM delivery_tracking_tokens)
ON CONFLICT (order_id) DO NOTHING;

-- Add index for better performance on token lookups
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_tokens_token ON delivery_tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_tokens_order_id ON delivery_tracking_tokens(order_id);

-- Update the RPC function with better error handling and partial data support
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_valid boolean;
  v_failed_attempts integer;
  v_order_id uuid;
BEGIN
  -- Check if token exists and is valid
  SELECT 
    (expires_at > now()),
    dtt.order_id
  INTO v_valid, v_order_id
  FROM delivery_tracking_tokens dtt
  WHERE token = p_token;
  
  -- Log the access attempt
  INSERT INTO tracking_access_logs (ip_address, token_accessed, success)
  VALUES ('0.0.0.0'::inet, p_token, COALESCE(v_valid, false));
  
  -- Check for rate limiting: count failed attempts in last 5 minutes
  SELECT COUNT(*)::integer
  INTO v_failed_attempts
  FROM tracking_access_logs
  WHERE success = false
  AND created_at > now() - interval '5 minutes';
  
  -- Block if more than 20 failed attempts in 5 minutes
  IF v_failed_attempts > 20 THEN
    RAISE EXCEPTION 'Too many failed tracking attempts. Please try again later.'
      USING HINT = 'Rate limit exceeded. Wait 5 minutes.';
  END IF;
  
  -- Return order data if token is valid (even if some fields are missing)
  IF v_valid AND v_order_id IS NOT NULL THEN
    -- Update last accessed timestamp
    UPDATE delivery_tracking_tokens 
    SET last_accessed_at = now() 
    WHERE token = p_token;
    
    -- Return order details with NULL handling for missing data
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
      COALESCE(c.company_name, 'Customer'),
      COALESCE(
        CONCAT(
          ca.street_address, ', ',
          COALESCE(ca.area || ', ', ''),
          ca.city, ', ',
          ca.region, ' - ',
          ca.ghana_digital_address
        ),
        'Address not available'
      )
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN customer_addresses ca ON ca.id = o.delivery_address_id
    WHERE o.id = v_order_id
    LIMIT 1;
  ELSE
    -- Log the failure reason
    PERFORM log_security_event(
      'tracking_token_invalid',
      NULL,
      jsonb_build_object(
        'token_valid', v_valid,
        'order_id_found', v_order_id IS NOT NULL,
        'token', p_token
      ),
      '0.0.0.0'::inet,
      NULL,
      'low'
    );
  END IF;
END;
$function$;

-- Function to generate tracking token on demand (Step 5)
CREATE OR REPLACE FUNCTION public.generate_tracking_token_for_order(p_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_order_status text;
  v_customer_id uuid;
  v_token_id uuid;
BEGIN
  -- Get order details
  SELECT status, customer_id INTO v_order_status, v_customer_id
  FROM orders
  WHERE id = p_order_id;
  
  -- Check if order exists
  IF v_order_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found'
    );
  END IF;
  
  -- Check if user owns this order (if authenticated)
  IF auth.uid() IS NOT NULL AND v_customer_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;
  
  -- Check if order is shipped or delivered
  IF v_order_status NOT IN ('shipped', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order must be shipped before tracking token can be generated',
      'status', v_order_status
    );
  END IF;
  
  -- Check if token already exists
  SELECT token INTO v_token
  FROM delivery_tracking_tokens
  WHERE order_id = p_order_id;
  
  IF v_token IS NOT NULL THEN
    -- Token already exists, return it
    RETURN jsonb_build_object(
      'success', true,
      'token', v_token,
      'already_existed', true
    );
  END IF;
  
  -- Create new token
  INSERT INTO delivery_tracking_tokens (order_id)
  VALUES (p_order_id)
  RETURNING token, id INTO v_token, v_token_id;
  
  -- Log token creation
  PERFORM log_security_event(
    'tracking_token_generated',
    auth.uid(),
    jsonb_build_object(
      'order_id', p_order_id,
      'token_id', v_token_id,
      'on_demand', true
    ),
    NULL,
    NULL,
    'low'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'token', v_token,
    'already_existed', false
  );
END;
$function$;