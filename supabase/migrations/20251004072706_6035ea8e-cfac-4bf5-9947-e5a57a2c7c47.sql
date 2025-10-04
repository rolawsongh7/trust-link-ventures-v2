-- Rename Entreco%CC%82te to Entrecote
UPDATE supplier_products 
SET name = 'Entrecote'
WHERE name LIKE '%ntreco%te%';