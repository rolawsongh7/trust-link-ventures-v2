-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'sales_manager', 'sales_rep', 'finance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lead_status enum
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create communication_type enum
DO $$ BEGIN
    CREATE TYPE communication_type AS ENUM ('email', 'call', 'meeting', 'note', 'document');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update customers table to match new schema
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update leads table structure
ALTER TABLE leads 
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS company_name,
DROP COLUMN IF EXISTS next_follow_up_date,
DROP COLUMN IF EXISTS last_activity_date;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS value NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS probability INTEGER,
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Update lead status column to use enum
ALTER TABLE leads 
ALTER COLUMN status DROP DEFAULT,
ALTER COLUMN status TYPE lead_status USING status::lead_status,
ALTER COLUMN status SET DEFAULT 'new';

-- Update quotes table to match schema
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id),
ADD COLUMN IF NOT EXISTS terms TEXT;

-- Update quote_items table structure
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

-- Update communications table structure
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id),
ADD COLUMN IF NOT EXISTS direction TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_date TIMESTAMPTZ;

-- Update communication type column to use enum
ALTER TABLE communications 
ALTER COLUMN communication_type TYPE communication_type USING communication_type::communication_type;

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

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for orders table
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();