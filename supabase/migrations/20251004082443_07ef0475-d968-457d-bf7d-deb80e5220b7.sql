-- Rename Tortuguita to Round Cut of Beef
UPDATE supplier_products 
SET name = 'Round Cut of Beef'
WHERE name ILIKE '%tortuguita%';