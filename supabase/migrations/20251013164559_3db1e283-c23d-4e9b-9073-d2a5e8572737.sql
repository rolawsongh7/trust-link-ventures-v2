-- Add payment_method column to orders table
ALTER TABLE orders 
ADD COLUMN payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'mobile_money'));

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_method IS 'Customer preferred payment method: bank_transfer or mobile_money';