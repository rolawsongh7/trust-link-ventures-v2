-- Create new enums with proper error handling
DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE communication_type AS ENUM ('email', 'call', 'meeting', 'note', 'document');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Clean up leads table - rename current status column temporarily
DO $$ BEGIN
    ALTER TABLE leads RENAME COLUMN status TO old_status;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Add new columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS value NUMERIC,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS probability INTEGER,
ADD COLUMN IF NOT EXISTS expected_close_date DATE,
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add new status column with enum type
DO $$ BEGIN
    ALTER TABLE leads ADD COLUMN status lead_status DEFAULT 'new';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Copy valid statuses from old column if it exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'old_status') THEN
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
    END IF;
END $$;

-- Drop old status column if it exists
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

-- Enable RLS on orders table if not already enabled
DO $$ BEGIN
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- Create RLS policies for orders table
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

CREATE POLICY "Users can view orders" ON orders 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert orders" ON orders 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update orders" ON orders 
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete orders" ON orders 
FOR DELETE USING (check_user_role(auth.uid(), 'admin'));

-- Add updated_at trigger for orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
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
DO $$ BEGIN
    ALTER TABLE communications RENAME COLUMN communication_type TO old_communication_type;
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Add new communication_type column with enum
DO $$ BEGIN
    ALTER TABLE communications ADD COLUMN communication_type communication_type DEFAULT 'note';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Copy values from old column if it exists
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'old_communication_type') THEN
        UPDATE communications SET communication_type = 
          CASE 
            WHEN old_communication_type = 'email' THEN 'email'::communication_type
            WHEN old_communication_type = 'call' THEN 'call'::communication_type
            WHEN old_communication_type = 'meeting' THEN 'meeting'::communication_type
            WHEN old_communication_type = 'note' THEN 'note'::communication_type
            WHEN old_communication_type = 'document' THEN 'document'::communication_type
            ELSE 'note'::communication_type
          END;
    END IF;
END $$;

-- Drop old communication_type column
ALTER TABLE communications DROP COLUMN IF EXISTS old_communication_type;