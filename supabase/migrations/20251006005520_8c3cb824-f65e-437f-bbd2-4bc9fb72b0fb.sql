-- Add delivery management fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_of_delivery_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES customer_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failed_delivery_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failed_delivery_count INTEGER DEFAULT 0;

-- Create delivery tracking tokens table for public tracking
CREATE TABLE IF NOT EXISTS delivery_tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT generate_secure_token(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on delivery tracking tokens
ALTER TABLE delivery_tracking_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tracking with valid token (public tracking)
CREATE POLICY "Anyone can view with valid token"
  ON delivery_tracking_tokens
  FOR SELECT
  USING (expires_at > now());

-- Policy: System can insert tracking tokens
CREATE POLICY "System can insert tracking tokens"
  ON delivery_tracking_tokens
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can manage tracking tokens
CREATE POLICY "Admins can manage tracking tokens"
  ON delivery_tracking_tokens
  FOR ALL
  USING (check_user_role(auth.uid(), 'admin'));

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_tokens_token ON delivery_tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_tokens_order_id ON delivery_tracking_tokens(order_id);

-- Function to validate and get order by tracking token
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_token(p_token TEXT)
RETURNS TABLE(
  order_id UUID,
  order_number TEXT,
  status TEXT,
  tracking_number TEXT,
  carrier TEXT,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_notes TEXT,
  customer_name TEXT,
  delivery_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update last accessed
  UPDATE delivery_tracking_tokens 
  SET last_accessed_at = now() 
  WHERE token = p_token AND expires_at > now();

  -- Return order details
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
$$;

-- Create delivery history table for tracking status changes
CREATE TABLE IF NOT EXISTS delivery_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on delivery history
ALTER TABLE delivery_history ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view delivery history
CREATE POLICY "Authenticated users can view delivery history"
  ON delivery_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policy: Authenticated users can insert delivery history
CREATE POLICY "Authenticated users can insert delivery history"
  ON delivery_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for delivery history
CREATE INDEX IF NOT EXISTS idx_delivery_history_order_id ON delivery_history(order_id);

-- Function to create tracking token when order is shipped
CREATE OR REPLACE FUNCTION public.create_tracking_token_on_ship()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create tracking token when order status changes to shipped
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
    INSERT INTO delivery_tracking_tokens (order_id)
    VALUES (NEW.id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating tracking tokens
DROP TRIGGER IF EXISTS create_tracking_token_trigger ON orders;
CREATE TRIGGER create_tracking_token_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION create_tracking_token_on_ship();

-- Add unique constraint to ensure one token per order
ALTER TABLE delivery_tracking_tokens DROP CONSTRAINT IF EXISTS unique_order_tracking;
ALTER TABLE delivery_tracking_tokens ADD CONSTRAINT unique_order_tracking UNIQUE (order_id);