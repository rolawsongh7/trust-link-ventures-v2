-- Deactivate Duck** product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%duck%' AND name LIKE '%**%';