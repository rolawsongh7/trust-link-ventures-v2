-- Deactivate chicken feet/paws products
UPDATE supplier_products 
SET is_active = false 
WHERE LOWER(name) LIKE '%chicken feet%' 
   OR LOWER(name) LIKE '%chicken paws%';