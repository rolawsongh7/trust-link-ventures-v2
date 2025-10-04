-- Rename Bife Angosto to Thin Steak
UPDATE supplier_products 
SET name = 'Thin Steak'
WHERE name = 'Bife Angosto';