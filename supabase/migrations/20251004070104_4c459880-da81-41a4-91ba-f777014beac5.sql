-- Deactivate Che%CC%80vre product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%che%vre%' OR name ILIKE '%chevre%';