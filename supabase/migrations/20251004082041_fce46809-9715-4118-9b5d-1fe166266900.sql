-- Deactivate Pork** product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%pork%' AND name LIKE '%**%';