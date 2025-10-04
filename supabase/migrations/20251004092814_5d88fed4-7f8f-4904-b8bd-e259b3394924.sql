-- Deactivate Chicken Wings 3 Joint A and B Grade products
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%Chicken Wings 3 Joint%'
AND (name ILIKE '%A Grade%' OR name ILIKE '%B Grade%');