-- Add biometric authentication preferences to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS biometric_enrolled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS biometric_device_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_biometric_enabled ON customers(biometric_enabled);

-- Add comment for documentation
COMMENT ON COLUMN customers.biometric_enabled IS 'Whether biometric authentication is enabled for customer login';
COMMENT ON COLUMN customers.biometric_enrolled_at IS 'Timestamp when biometric was first enrolled';
COMMENT ON COLUMN customers.biometric_device_id IS 'Device ID where biometric is enrolled (for security tracking)';