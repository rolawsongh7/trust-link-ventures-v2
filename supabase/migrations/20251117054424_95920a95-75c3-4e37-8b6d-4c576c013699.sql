-- Add threading columns to communications table
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS parent_communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS thread_position INTEGER DEFAULT 0;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_communications_parent_id ON communications(parent_communication_id);
CREATE INDEX IF NOT EXISTS idx_communications_thread_id ON communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_communications_thread_position ON communications(thread_id, thread_position);

-- Backfill thread_id for existing communications
-- Original messages (no parent) get their own ID as thread_id
UPDATE communications 
SET thread_id = id 
WHERE parent_communication_id IS NULL AND thread_id IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN communications.parent_communication_id IS 'Links a reply to its parent message';
COMMENT ON COLUMN communications.thread_id IS 'Groups all messages in the same conversation thread';
COMMENT ON COLUMN communications.thread_position IS 'Tracks message order within a thread (0 = original, 1+ = replies)';

-- Create function to get customer communication threads
CREATE OR REPLACE FUNCTION get_customer_communication_threads(customer_uuid UUID)
RETURNS TABLE (
  id UUID,
  parent_communication_id UUID,
  thread_id UUID,
  thread_position INTEGER,
  subject TEXT,
  content TEXT,
  communication_type communication_type,
  direction TEXT,
  communication_date TIMESTAMPTZ,
  contact_person TEXT,
  created_at TIMESTAMPTZ,
  reply_count BIGINT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.parent_communication_id,
    c.thread_id,
    c.thread_position,
    c.subject,
    c.content,
    c.communication_type,
    c.direction,
    c.communication_date,
    c.contact_person,
    c.created_at,
    (SELECT COUNT(*) FROM communications replies 
     WHERE replies.parent_communication_id = c.id) as reply_count
  FROM communications c
  WHERE c.customer_id = customer_uuid
  ORDER BY 
    COALESCE(c.thread_id, c.id) DESC,
    c.thread_position ASC,
    c.communication_date ASC;
END;
$$ LANGUAGE plpgsql;