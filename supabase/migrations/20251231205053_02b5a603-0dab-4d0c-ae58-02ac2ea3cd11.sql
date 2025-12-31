-- Add shipping_fee column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_fee numeric DEFAULT 0;

COMMENT ON COLUMN invoices.shipping_fee IS 'Shipping/delivery fee from the original quote';