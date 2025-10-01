-- Make rfq_id nullable in magic_link_tokens table since not all magic links are RFQ-related
-- Some magic links are for quote approvals, order tracking, etc.
ALTER TABLE magic_link_tokens 
ALTER COLUMN rfq_id DROP NOT NULL;