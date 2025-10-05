-- Add missing columns to existing customer_addresses table
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS ghana_digital_address TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS additional_directions TEXT;
ALTER TABLE customer_addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Make required fields non-null (only for new rows)
DO $$ 
BEGIN
  -- Update existing null values first
  UPDATE customer_addresses SET receiver_name = 'Not Set' WHERE receiver_name IS NULL;
  UPDATE customer_addresses SET phone_number = '0000000000' WHERE phone_number IS NULL;
  UPDATE customer_addresses SET ghana_digital_address = 'NOT-SET' WHERE ghana_digital_address IS NULL;
  UPDATE customer_addresses SET region = 'Not Set' WHERE region IS NULL;
  UPDATE customer_addresses SET city = 'Not Set' WHERE city IS NULL;
  UPDATE customer_addresses SET street_address = 'Not Set' WHERE street_address IS NULL;
END $$;

-- Add delivery address to quote_requests and orders
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES customer_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES customer_addresses(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_default ON customer_addresses(customer_id, is_default) WHERE is_default = true;

-- Function to ensure only one default address per customer
CREATE OR REPLACE FUNCTION enforce_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE customer_addresses 
    SET is_default = false 
    WHERE customer_id = NEW.customer_id 
    AND id != NEW.id 
    AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS ensure_single_default_address ON customer_addresses;
CREATE TRIGGER ensure_single_default_address
  BEFORE INSERT OR UPDATE ON customer_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION enforce_single_default_address();