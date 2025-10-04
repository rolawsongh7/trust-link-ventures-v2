-- Deactivate Hen product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%hen%' AND name NOT ILIKE '%chicken%';