-- Simplified Quote and RFQ Workflow Implementation

-- First, let's add the origin_type field to existing quotes table and ensure proper structure
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'manual' CHECK (origin_type IN ('direct', 'rfq', 'manual'));

-- Update existing quotes to have proper origin_type
UPDATE quotes SET origin_type = 'manual' WHERE origin_type IS NULL;

-- Create RFQs table (linked to quotes when supplier input needed)
CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RFQ Responses table (supplier responses)
CREATE TABLE IF NOT EXISTS rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL DEFAULT '{}', -- stores items, pricing, terms, etc.
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

-- Create orders table (auto-generated from accepted quotes)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  specifications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for RFQs
CREATE POLICY "Authenticated users can view RFQs" ON rfqs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage RFQs" ON rfqs
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- RLS Policies for RFQ Responses
CREATE POLICY "Suppliers can view their own RFQ responses" ON rfq_responses
  FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_id 
      AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR auth.uid() IS NOT NULL -- Admins/sales can see all
  );

CREATE POLICY "Suppliers can manage their own RFQ responses" ON rfq_responses
  FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM suppliers s 
      WHERE s.id = supplier_id 
      AND s.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    OR auth.uid() IS NOT NULL -- Admins can manage all
  );

-- RLS Policies for Orders
CREATE POLICY "Authenticated users can view orders" ON orders
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- RLS Policies for Order Items
CREATE POLICY "Authenticated users can view order items" ON order_items
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage order items" ON order_items
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL);

-- Update triggers for timestamps
CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfq_responses_updated_at BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_number TEXT;
  counter INTEGER;
BEGIN
  -- Get the current year and month
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-(\d+)') AS INTEGER)), 0) + 1
  INTO counter
  FROM orders
  WHERE order_number LIKE 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-%';
  
  order_number := 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(counter::TEXT, 4, '0');
  
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-convert accepted quotes to orders
CREATE OR REPLACE FUNCTION auto_convert_quote_to_order()
RETURNS TRIGGER AS $$
DECLARE
  order_id UUID;
  quote_item RECORD;
BEGIN
  -- Only trigger when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Create order
    INSERT INTO orders (
      quote_id,
      customer_id,
      order_number,
      total_amount,
      currency,
      status,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      generate_order_number(),
      NEW.total_amount,
      NEW.currency,
      'pending',
      'Auto-generated from accepted quote: ' || NEW.quote_number,
      auth.uid()
    ) RETURNING id INTO order_id;

    -- Copy quote items to order items
    FOR quote_item IN 
      SELECT * FROM quote_items WHERE quote_id = NEW.id
    LOOP
      INSERT INTO order_items (
        order_id,
        product_name,
        product_description,
        quantity,
        unit,
        unit_price,
        total_price,
        specifications
      ) VALUES (
        order_id,
        quote_item.product_name,
        quote_item.product_description,
        quote_item.quantity,
        quote_item.unit,
        quote_item.unit_price,
        quote_item.total_price,
        quote_item.specifications
      );
    END LOOP;

    -- Log the conversion
    PERFORM log_security_event(
      'quote_converted_to_order',
      auth.uid(),
      jsonb_build_object(
        'quote_id', NEW.id,
        'order_id', order_id,
        'quote_number', NEW.quote_number
      ),
      NULL,
      NULL,
      'low'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-convert accepted quotes to orders
DROP TRIGGER IF EXISTS auto_convert_quote_to_order_trigger ON quotes;
CREATE TRIGGER auto_convert_quote_to_order_trigger
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_convert_quote_to_order();

-- Function to auto-create RFQ when needed (business rules)
CREATE OR REPLACE FUNCTION auto_create_rfq_if_needed()
RETURNS TRIGGER AS $$
DECLARE
  total_amount DECIMAL;
  requires_rfq BOOLEAN := FALSE;
BEGIN
  -- Business rule: Create RFQ if total amount > $10,000 or origin_type is 'rfq'
  IF NEW.origin_type = 'rfq' OR NEW.total_amount > 10000 THEN
    requires_rfq := TRUE;
  END IF;

  -- Check if any items are marked as custom (you can expand this logic)
  IF EXISTS (
    SELECT 1 FROM quote_items 
    WHERE quote_id = NEW.id 
    AND (specifications ILIKE '%custom%' OR specifications ILIKE '%special%')
  ) THEN
    requires_rfq := TRUE;
  END IF;

  -- Create RFQ if needed and not already exists
  IF requires_rfq AND NOT EXISTS (SELECT 1 FROM rfqs WHERE quote_id = NEW.id) THEN
    INSERT INTO rfqs (
      quote_id,
      title,
      description,
      deadline,
      created_by
    ) VALUES (
      NEW.id,
      'RFQ for Quote: ' || NEW.quote_number,
      NEW.description || CASE 
        WHEN NEW.total_amount > 10000 THEN ' (High value quote requiring supplier input)'
        ELSE ' (Custom specifications requiring supplier input)'
      END,
      CURRENT_DATE + INTERVAL '7 days',
      auth.uid()
    );

    -- Update quote origin_type if not already set
    IF NEW.origin_type != 'rfq' THEN
      UPDATE quotes SET origin_type = 'rfq' WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create RFQ when business rules are met
DROP TRIGGER IF EXISTS auto_create_rfq_trigger ON quotes;
CREATE TRIGGER auto_create_rfq_trigger
  AFTER INSERT OR UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_rfq_if_needed();