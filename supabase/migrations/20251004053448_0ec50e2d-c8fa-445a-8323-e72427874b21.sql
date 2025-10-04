-- Rename Bife Ancho to Wide Steak
UPDATE supplier_products 
SET name = 'Wide Steak'
WHERE name = 'Bife Ancho';