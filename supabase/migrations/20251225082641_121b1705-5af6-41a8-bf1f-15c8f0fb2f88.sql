-- Add onboarding tracking columns to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;