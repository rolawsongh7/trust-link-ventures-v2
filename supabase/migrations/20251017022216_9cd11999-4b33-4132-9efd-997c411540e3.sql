-- Enable pgcrypto extension for gen_random_bytes() function
-- This is required for delivery_history table and other security features
CREATE EXTENSION IF NOT EXISTS pgcrypto;