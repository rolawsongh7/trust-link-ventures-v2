-- Add last_password_changed column to customers table
ALTER TABLE customers 
ADD COLUMN last_password_changed TIMESTAMP WITH TIME ZONE;