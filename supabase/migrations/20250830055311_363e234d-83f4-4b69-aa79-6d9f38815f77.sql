-- Create new enums
CREATE TYPE IF NOT EXISTS lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
CREATE TYPE IF NOT EXISTS communication_type AS ENUM ('email', 'call', 'meeting', 'note', 'document');

-- Update customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Clean up leads table - rename current status column temporarily
ALTER TABLE leads 
RENAME COLUMN status TO old_status;

-- Add new columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS value NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS probability INTEGER,
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN status lead_status DEFAULT 'new';

-- Copy valid statuses from old column
UPDATE leads SET status = 
  CASE 
    WHEN old_status = 'new' THEN 'new'::lead_status
    WHEN old_status = 'contacted' THEN 'contacted'::lead_status
    WHEN old_status = 'qualified' THEN 'qualified'::lead_status
    WHEN old_status = 'proposal' THEN 'proposal'::lead_status
    WHEN old_status = 'negotiation' THEN 'negotiation'::lead_status
    WHEN old_status = 'closed_won' THEN 'closed_won'::lead_status
    WHEN old_status = 'closed_lost' THEN 'closed_lost'::lead_status
    ELSE 'new'::lead_status
  END;

-- Drop old status column
ALTER TABLE leads DROP COLUMN IF EXISTS old_status;

-- Drop unnecessary columns from leads
ALTER TABLE leads 
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS company_name,
DROP COLUMN IF EXISTS next_follow_up_date,
DROP COLUMN IF EXISTS last_activity_date;

-- Update quotes table
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id),
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Update quote_items table
ALTER TABLE quote_items 
ADD COLUMN IF NOT EXISTS product_description TEXT;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  quote_id UUID REFERENCES quotes(id),
  order_number TEXT UNIQUE NOT NULL,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders table
CREATE POLICY "Users can view orders" ON orders 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert orders" ON orders 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update orders" ON orders 
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete orders" ON orders 
FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Add updated_at trigger for orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update communications table
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS direction TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ;

-- Handle communication type conversion by renaming current column
ALTER TABLE communications 
RENAME COLUMN communication_type TO old_communication_type;

-- Add new communication_type column with enum
ALTER TABLE communications 
ADD COLUMN communication_type communication_type DEFAULT 'note';

-- Copy values from old column
UPDATE communications SET communication_type = 
  CASE 
    WHEN old_communication_type = 'email' THEN 'email'::communication_type
    WHEN old_communication_type = 'call' THEN 'call'::communication_type
    WHEN old_communication_type = 'meeting' THEN 'meeting'::communication_type
    WHEN old_communication_type = 'note' THEN 'note'::communication_type
    WHEN old_communication_type = 'document' THEN 'document'::communication_type
    ELSE 'note'::communication_type
  END;

-- Drop old communication_type column
ALTER TABLE communications DROP COLUMN old_communication_type;