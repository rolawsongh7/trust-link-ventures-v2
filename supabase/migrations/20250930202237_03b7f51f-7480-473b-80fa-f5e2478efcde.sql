-- Drop the automatic RFQ creation trigger
DROP TRIGGER IF EXISTS auto_create_rfq_trigger ON quotes CASCADE;