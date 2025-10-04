-- Deactivate Other meats** product
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%other meats%' AND name LIKE '%**%';