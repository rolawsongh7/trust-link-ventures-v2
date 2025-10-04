-- Deactivate Chicken Upperbacks product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%chicken upperback%';