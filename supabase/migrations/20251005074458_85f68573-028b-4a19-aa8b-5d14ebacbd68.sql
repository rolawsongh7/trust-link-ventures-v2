-- Drop existing trigger and default
DROP TRIGGER IF EXISTS order_status_timestamp_trigger ON orders;
ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;

-- Add new tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_to_ship_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_proof_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_signature TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failed_delivery_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS failed_delivery_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Change status to text
ALTER TABLE orders ALTER COLUMN status TYPE TEXT;

-- Create enum
DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM (
    'quote_pending',
    'quote_sent', 
    'order_confirmed',
    'payment_received',
    'processing',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'delivery_failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update existing values
UPDATE orders SET status = 'order_confirmed' WHERE status IN ('pending', 'confirmed', '');
UPDATE orders SET status = 'shipped' WHERE status = 'in_transit';
UPDATE orders SET status = 'cancelled' WHERE status = 'canceled';

-- Convert to enum
ALTER TABLE orders ALTER COLUMN status TYPE order_status_enum USING status::order_status_enum;
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'order_confirmed'::order_status_enum;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);

-- Function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_order_status_timestamps()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER order_status_timestamp_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_order_status_timestamps();