-- Rename Boulettes de viande to Meatballs
UPDATE supplier_products 
SET name = 'Meatballs'
WHERE name ILIKE '%boulettes%viande%';