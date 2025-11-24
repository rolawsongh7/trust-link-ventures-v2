-- Add new columns to quotes table for tax and shipping
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_inclusive boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN quotes.subtotal IS 'Sum of all line items before tax and shipping';
COMMENT ON COLUMN quotes.tax_rate IS 'Tax rate percentage (e.g., 21.0 for 21%)';
COMMENT ON COLUMN quotes.tax_amount IS 'Calculated tax amount';
COMMENT ON COLUMN quotes.shipping_fee IS 'Shipping/delivery fee';
COMMENT ON COLUMN quotes.tax_inclusive IS 'Whether tax is included in item prices';

-- Populate subtotal for existing quotes (equals total_amount for old quotes without tax/shipping)
UPDATE quotes 
SET subtotal = total_amount 
WHERE subtotal = 0 AND total_amount > 0;