-- Rename Bifteck de flanc to Flank Steak
UPDATE supplier_products 
SET name = 'Flank Steak'
WHERE name = 'Bifteck de flanc';