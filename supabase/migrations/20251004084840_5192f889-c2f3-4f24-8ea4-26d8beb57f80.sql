-- Deactivate Gibier 1 product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%gibier 1%';