-- Rename Ojo Bife Ancho to Ribeye Steak
UPDATE supplier_products 
SET name = 'Ribeye Steak'
WHERE name ILIKE '%ojo bife ancho%';