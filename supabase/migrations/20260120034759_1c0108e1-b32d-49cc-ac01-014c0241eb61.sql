-- Add issue_id column to communications table
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS issue_id UUID REFERENCES order_issues(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_communications_issue_id ON communications(issue_id);

-- Create storage bucket for order issues if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-issues', 'order-issues', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any to recreate them
DROP POLICY IF EXISTS "Users can upload issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view issue photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own issue photos" ON storage.objects;

-- RLS policies for order-issues bucket
CREATE POLICY "Users can upload issue photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-issues');

CREATE POLICY "Anyone can view issue photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-issues');

CREATE POLICY "Users can delete own issue photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-issues');

-- Function to check for duplicate issues within 24 hours
CREATE OR REPLACE FUNCTION check_duplicate_issue()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM order_issues 
    WHERE order_id = NEW.order_id 
    AND customer_id = NEW.customer_id
    AND status NOT IN ('resolved', 'rejected')
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'An unresolved issue was already submitted for this order within the last 24 hours. Please wait for a response or check your existing issue.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for duplicate prevention
DROP TRIGGER IF EXISTS prevent_duplicate_issues ON order_issues;
CREATE TRIGGER prevent_duplicate_issues
BEFORE INSERT ON order_issues
FOR EACH ROW EXECUTE FUNCTION check_duplicate_issue();

-- RLS policies for communications linked to issues
DROP POLICY IF EXISTS "Customers can view their issue communications" ON communications;
DROP POLICY IF EXISTS "Customers can create issue replies" ON communications;
DROP POLICY IF EXISTS "Admins can manage all issue communications" ON communications;

-- Customers can view communications for their issues
CREATE POLICY "Customers can view their issue communications"
ON communications
FOR SELECT
TO authenticated
USING (
  issue_id IS NOT NULL AND
  issue_id IN (
    SELECT oi.id FROM order_issues oi
    WHERE oi.customer_id IN (
      SELECT cu.customer_id FROM customer_users cu WHERE cu.user_id = auth.uid()
    )
  )
);

-- Customers can create replies to their issues
CREATE POLICY "Customers can create issue replies"
ON communications
FOR INSERT
TO authenticated
WITH CHECK (
  issue_id IS NULL OR
  issue_id IN (
    SELECT oi.id FROM order_issues oi
    WHERE oi.customer_id IN (
      SELECT cu.customer_id FROM customer_users cu WHERE cu.user_id = auth.uid()
    )
  )
);