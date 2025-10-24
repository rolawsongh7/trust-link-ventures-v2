-- Add GhIPSS payment gateway columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'manual' 
  CHECK (payment_gateway IN ('manual', 'ghipss'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghipss_reference TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghipss_transaction_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghipss_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_amount_paid NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_channel TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_initiated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ghipss_metadata JSONB;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_ghipss_reference ON orders(ghipss_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_gateway ON orders(payment_gateway);

-- Add helpful comments
COMMENT ON COLUMN orders.payment_gateway IS 'Payment method: manual (bank/receipt) or ghipss (auto-verified)';
COMMENT ON COLUMN orders.ghipss_reference IS 'Unique GhIPSS transaction reference for tracking';
COMMENT ON COLUMN orders.payment_channel IS 'Specific channel used: bank_transfer, mobile_money, or card';

-- Create payment transactions audit table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  ghipss_reference TEXT UNIQUE NOT NULL,
  ghipss_transaction_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  payment_channel TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  ghipss_response JSONB,
  webhook_received_at TIMESTAMP WITH TIME ZONE,
  verification_attempts INTEGER DEFAULT 0,
  last_verification_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for payment_transactions
CREATE INDEX idx_payment_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_ghipss_reference ON payment_transactions(ghipss_reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- Enable RLS for payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view all payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create payment settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default payment tier thresholds
INSERT INTO payment_settings (setting_key, setting_value) VALUES
  ('payment_tiers', '{
    "tier1_max": 5000,
    "tier2_max": 50000,
    "tier3_max": null,
    "currency": "GHS",
    "tier1_method": "ghipss",
    "tier2_method": "ghipss",
    "tier3_method": "manual"
  }'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS for payment_settings
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy for payment_settings
CREATE POLICY "Admins can manage payment settings"
  ON payment_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );