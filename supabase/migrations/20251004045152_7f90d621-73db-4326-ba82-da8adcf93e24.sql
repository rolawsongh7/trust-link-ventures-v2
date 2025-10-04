-- Deactivate tilapia products
UPDATE supplier_products 
SET is_active = false 
WHERE LOWER(name) LIKE '%tilapia%';