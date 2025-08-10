-- Enhance existing CRM tables and add missing functionality

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_communications_customer_id ON communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);

-- Add missing columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_contact_date DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_status TEXT DEFAULT 'active';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high'));
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE customers ADD COLUMN IF NOT EXISTS annual_revenue NUMERIC;

-- Add missing columns to leads table  
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_date DATE;

-- Create activities table for tracking all customer interactions
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'quote_sent', 'proposal_sent')),
    subject TEXT NOT NULL,
    description TEXT,
    activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activities
CREATE POLICY "Users can view activities" ON activities
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert activities" ON activities
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update activities" ON activities
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete activities" ON activities
FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Create opportunities table (enhanced leads with more sales tracking)
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    value NUMERIC DEFAULT 0,
    probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
    stage TEXT NOT NULL DEFAULT 'qualification' CHECK (stage IN ('qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
    expected_close_date DATE,
    actual_close_date DATE,
    close_reason TEXT,
    source TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on opportunities
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for opportunities
CREATE POLICY "Enhanced users can view opportunities" ON opportunities
FOR SELECT USING (auth.uid() IS NOT NULL AND (get_user_role(auth.uid()) = 'admin' OR assigned_to = auth.uid()));

CREATE POLICY "Users can insert opportunities" ON opportunities
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update opportunities" ON opportunities
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete opportunities" ON opportunities
FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Create products table for quote line items
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_price NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    is_active BOOLEAN DEFAULT true,
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Users can view active products" ON products
FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Users can insert products" ON products
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update products" ON products
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete products" ON products
FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- Create pipeline_stages table for customizable sales pipelines
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    probability INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pipeline_stages
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pipeline_stages
CREATE POLICY "Users can view pipeline stages" ON pipeline_stages
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage pipeline stages" ON pipeline_stages
FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, probability) VALUES
('New Lead', 1, 10),
('Qualified', 2, 25),
('Proposal Sent', 3, 50),
('Negotiation', 4, 75),
('Closed Won', 5, 100),
('Closed Lost', 6, 0)
ON CONFLICT DO NOTHING;

-- Create tags table for better organization
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#6B7280',
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'lead', 'opportunity')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tags
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tags
CREATE POLICY "Users can view tags" ON tags
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage tags" ON tags
FOR ALL USING (auth.uid() IS NOT NULL);

-- Create entity_tags junction table
CREATE TABLE IF NOT EXISTS entity_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'lead', 'opportunity')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(entity_id, tag_id, entity_type)
);

-- Enable RLS on entity_tags
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for entity_tags
CREATE POLICY "Users can view entity tags" ON entity_tags
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage entity tags" ON entity_tags
FOR ALL USING (auth.uid() IS NOT NULL);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();