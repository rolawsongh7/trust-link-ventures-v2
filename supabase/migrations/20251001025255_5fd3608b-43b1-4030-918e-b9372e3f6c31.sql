-- Fix customer_email data inconsistency in quotes table
-- Update quotes where customer_email contains a name instead of an email
UPDATE quotes
SET customer_email = customers.email
FROM customers
WHERE quotes.customer_id = customers.id
  AND quotes.customer_email IS NOT NULL
  AND quotes.customer_email NOT LIKE '%@%';