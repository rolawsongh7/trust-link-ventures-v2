-- Add payment proof tracking fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_proof_uploaded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_proof_uploaded 
ON orders(payment_proof_uploaded_at) 
WHERE payment_proof_uploaded_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_proof_uploaded_at IS 'Timestamp when customer uploaded payment proof';
COMMENT ON COLUMN orders.payment_verified_by IS 'Admin user who verified the payment';
COMMENT ON COLUMN orders.payment_verified_at IS 'Timestamp when admin verified the payment';