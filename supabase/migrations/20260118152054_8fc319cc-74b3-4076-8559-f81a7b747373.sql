-- Add read_at column for tracking when messages are read
ALTER TABLE communications 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Mark all outbound messages (sent by customer) as already read
UPDATE communications 
SET read_at = created_at 
WHERE direction = 'outbound' AND read_at IS NULL;

-- Fix orphan thread_ids - set thread_id to self for messages without thread_id
UPDATE communications 
SET thread_id = id 
WHERE thread_id IS NULL AND parent_communication_id IS NULL;

-- Create index for faster thread queries
CREATE INDEX IF NOT EXISTS idx_communications_thread_id ON communications(thread_id);
CREATE INDEX IF NOT EXISTS idx_communications_read_at ON communications(read_at);
CREATE INDEX IF NOT EXISTS idx_communications_customer_thread ON communications(customer_id, thread_id);