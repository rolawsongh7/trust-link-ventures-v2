-- Rename Carne Quijada to Beef Cheek (Jaw Meat)
UPDATE supplier_products 
SET name = 'Beef Cheek (Jaw Meat)'
WHERE name ILIKE '%carne quijada%';