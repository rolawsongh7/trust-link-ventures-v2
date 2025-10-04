-- Rename Colita de Cuadril to Beef Bottom Sirloin
UPDATE supplier_products 
SET name = 'Beef Bottom Sirloin'
WHERE name ILIKE '%colita de cuadril%';