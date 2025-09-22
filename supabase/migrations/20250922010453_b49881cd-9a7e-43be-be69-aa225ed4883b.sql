-- Call the import function to import JAB Brothers seafood products
SELECT extensions.http_post_sync(
  'https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/import-supplier-catalog',
  '{"supplier": "JAB Brothers", "category": "Seafood", "url": "https://www.jab-bros.com.ar/seafood", "download": true, "clearExisting": true}',
  'application/json'
);