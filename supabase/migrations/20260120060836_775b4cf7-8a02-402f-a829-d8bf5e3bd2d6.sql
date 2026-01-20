-- Add action event columns to user_notifications
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS requires_action boolean DEFAULT false;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS deep_link text;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer';
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS reminder_count integer DEFAULT 0;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz;

-- Create index for fast action queries
CREATE INDEX IF NOT EXISTS idx_notifications_action_required 
ON user_notifications (user_id, requires_action, resolved) 
WHERE requires_action = true AND resolved = false;

-- Create index for entity lookups (for resolution)
CREATE INDEX IF NOT EXISTS idx_notifications_entity
ON user_notifications (entity_type, entity_id)
WHERE requires_action = true;

-- Create function to auto-resolve notifications when orders are updated
CREATE OR REPLACE FUNCTION auto_resolve_order_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment_proof_url is set, resolve payment alerts
  IF NEW.payment_proof_url IS NOT NULL AND (OLD.payment_proof_url IS NULL OR OLD.payment_proof_url = '') THEN
    UPDATE user_notifications 
    SET resolved = true, resolved_at = now()
    WHERE entity_type = 'order' 
    AND entity_id = NEW.id 
    AND type IN ('payment_required', 'payment_needed')
    AND resolved = false;
  END IF;
  
  -- When delivery_address_id is set, resolve address alerts
  IF NEW.delivery_address_id IS NOT NULL AND OLD.delivery_address_id IS NULL THEN
    UPDATE user_notifications 
    SET resolved = true, resolved_at = now()
    WHERE entity_type = 'order' 
    AND entity_id = NEW.id 
    AND type IN ('address_required', 'address_needed')
    AND resolved = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-resolution
DROP TRIGGER IF EXISTS orders_auto_resolve_notifications ON orders;
CREATE TRIGGER orders_auto_resolve_notifications
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_order_notifications();

-- Create function to auto-resolve quote notifications
CREATE OR REPLACE FUNCTION auto_resolve_quote_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- When quote is accepted, resolve quote alerts
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE user_notifications 
    SET resolved = true, resolved_at = now()
    WHERE entity_type = 'quote' 
    AND entity_id = NEW.id 
    AND type IN ('quote_pending', 'quote_expiring')
    AND resolved = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quote auto-resolution
DROP TRIGGER IF EXISTS quotes_auto_resolve_notifications ON quotes;
CREATE TRIGGER quotes_auto_resolve_notifications
AFTER UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_quote_notifications();

-- Create function to auto-resolve issue notifications
CREATE OR REPLACE FUNCTION auto_resolve_issue_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- When issue status changes from reviewing, resolve alerts
  IF NEW.status != 'reviewing' AND OLD.status = 'reviewing' THEN
    UPDATE user_notifications 
    SET resolved = true, resolved_at = now()
    WHERE entity_type = 'issue' 
    AND entity_id = NEW.id 
    AND type = 'issue_response_needed'
    AND resolved = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for issue auto-resolution
DROP TRIGGER IF EXISTS issues_auto_resolve_notifications ON order_issues;
CREATE TRIGGER issues_auto_resolve_notifications
AFTER UPDATE ON order_issues
FOR EACH ROW
EXECUTE FUNCTION auto_resolve_issue_notifications();