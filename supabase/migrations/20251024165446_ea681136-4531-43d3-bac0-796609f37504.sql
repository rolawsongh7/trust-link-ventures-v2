-- Update payment gateway constraint to include Paystack
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_gateway_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_gateway_check 
  CHECK (payment_gateway IN ('manual', 'ghipss', 'paystack'));

-- Log the migration
SELECT log_security_event(
  'paystack_gateway_added',
  NULL,
  jsonb_build_object(
    'migration_type', 'add_paystack_gateway',
    'gateway_added', 'paystack'
  ),
  NULL,
  NULL,
  'low'
);