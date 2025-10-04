-- Deactivate multiple products
UPDATE supplier_products 
SET is_active = false
WHERE name ILIKE '%golden porky%'
   OR name ILIKE '%dutch style%'
   OR name ILIKE '%pelco%kahawai%'
   OR name ILIKE '%russian style%'
   OR name ILIKE '%sigma marine%'
   OR name ILIKE '%smaak%';