import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js@1.29.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductImageData {
  name: string;
  imageUrl: string;
  category: 'seafood' | 'meat-poultry';
}

interface SupabaseProductRow {
  id: string;
  name: string;
  image_public_url: string | null;
  slug: string;
  category: string;
}

// Helper function to clean and normalize product names for matching
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Helper function to extract product data from crawled content
function extractProductImages(content: string, category: 'seafood' | 'meat-poultry'): ProductImageData[] {
  const products: ProductImageData[] = [];
  
  // Look for image tags with product information
  const imageRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const imageUrl = match[1];
    const altText = match[2];
    
    // Skip if it's a logo, icon, or clearly not a product image
    if (imageUrl.includes('logo') || imageUrl.includes('icon') || 
        altText.toLowerCase().includes('logo') || altText.toLowerCase().includes('icon')) {
      continue;
    }
    
    // Extract product name from alt text or nearby content
    let productName = altText;
    if (!productName || productName.length < 3) {
      // Try to find product name in nearby content
      const imgIndex = content.indexOf(match[0]);
      const contextBefore = content.substring(Math.max(0, imgIndex - 200), imgIndex);
      const contextAfter = content.substring(imgIndex + match[0].length, imgIndex + match[0].length + 200);
      
      // Look for headings or product names
      const headingMatch = (contextBefore + contextAfter).match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i);
      if (headingMatch) {
        productName = headingMatch[1];
      }
    }
    
    if (productName && productName.length > 2) {
      products.push({
        name: productName.trim(),
        imageUrl: imageUrl.startsWith('http') ? imageUrl : `https://marsea.co.uk${imageUrl}`,
        category
      });
    }
  }
  
  return products;
}

// Helper function to find best matching product
function findBestMatch(dbProductName: string, crawledProducts: ProductImageData[]): ProductImageData | null {
  const normalizedDbName = normalizeProductName(dbProductName);
  
  // First try exact match
  for (const product of crawledProducts) {
    if (normalizeProductName(product.name) === normalizedDbName) {
      return product;
    }
  }
  
  // Then try partial matches
  for (const product of crawledProducts) {
    const normalizedCrawledName = normalizeProductName(product.name);
    if (normalizedDbName.includes(normalizedCrawledName) || 
        normalizedCrawledName.includes(normalizedDbName)) {
      return product;
    }
  }
  
  // Try word-based matching
  const dbWords = normalizedDbName.split(' ').filter(word => word.length > 2);
  for (const product of crawledProducts) {
    const crawledWords = normalizeProductName(product.name).split(' ').filter(word => word.length > 2);
    const commonWords = dbWords.filter(word => crawledWords.includes(word));
    
    if (commonWords.length >= Math.min(2, Math.min(dbWords.length, crawledWords.length))) {
      return product;
    }
  }
  
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting J. Marr product image update process');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !firecrawlApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const firecrawlApp = new FirecrawlApp({ apiKey: firecrawlApiKey });

    console.log('Fetching current J. Marr products from database');
    
    // Get all J. Marr products that might have packaging images
    const { data: jmarrProducts, error: fetchError } = await supabase
      .from('supplier_products')
      .select('id, name, image_public_url, slug, category')
      .eq('supplier', 'J. Marr')
      .returns<SupabaseProductRow[]>();

    if (fetchError) {
      throw new Error(`Failed to fetch J. Marr products: ${fetchError.message}`);
    }

    if (!jmarrProducts || jmarrProducts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No J. Marr products found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${jmarrProducts.length} J. Marr products`);

    // Crawl both websites to get product images
    console.log('Crawling J. Marr seafood website');
    const seafoodCrawl = await firecrawlApp.scrapeUrl('https://marsea.co.uk/fish', {
      formats: ['html'],
    });

    console.log('Crawling J. Marr meat & poultry website');
    const meatCrawl = await firecrawlApp.scrapeUrl('https://marsea.co.uk/meat', {
      formats: ['html'],
    });

    if (!seafoodCrawl.success || !meatCrawl.success) {
      throw new Error('Failed to crawl J. Marr websites');
    }

    // Extract product images from crawled content
    const seafoodProducts = extractProductImages(seafoodCrawl.data?.html || '', 'seafood');
    const meatProducts = extractProductImages(meatCrawl.data?.html || '', 'meat-poultry');
    
    console.log(`Extracted ${seafoodProducts.length} seafood products and ${meatProducts.length} meat products`);

    const allCrawledProducts = [...seafoodProducts, ...meatProducts];
    
    // Update products with better images
    const updates: { id: string; name: string; newImageUrl: string }[] = [];
    
    for (const dbProduct of jmarrProducts) {
      // Skip if already has a good image (not a carton/packaging)
      if (dbProduct.image_public_url && 
          !dbProduct.image_public_url.toLowerCase().includes('carton') &&
          !dbProduct.image_public_url.toLowerCase().includes('package') &&
          !dbProduct.name.toLowerCase().includes('carton')) {
        continue;
      }

      // Find matching product from crawled data
      const matchedProduct = findBestMatch(dbProduct.name, allCrawledProducts);
      
      if (matchedProduct) {
        updates.push({
          id: dbProduct.id,
          name: dbProduct.name,
          newImageUrl: matchedProduct.imageUrl
        });
      }
    }

    console.log(`Found ${updates.length} products to update`);

    // Perform batch updates
    let updatedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('supplier_products')
        .update({ 
          image_public_url: update.newImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Failed to update product ${update.name}:`, updateError);
      } else {
        console.log(`Updated ${update.name} with new image: ${update.newImageUrl}`);
        updatedCount++;
      }
    }

    // Also update any products that clearly have carton/packaging names
    console.log('Updating products with carton/packaging in names');
    const { data: cartonProducts } = await supabase
      .from('supplier_products')
      .select('id, name')
      .eq('supplier', 'J. Marr')
      .or('name.ilike.%carton%,name.ilike.%package%,name.ilike.%box%');

    if (cartonProducts && cartonProducts.length > 0) {
      // Set these to null so they can be handled separately or hidden
      for (const cartonProduct of cartonProducts) {
        await supabase
          .from('supplier_products')
          .update({ 
            is_active: false, // Hide packaging products
            updated_at: new Date().toISOString()
          })
          .eq('id', cartonProduct.id);
        
        console.log(`Deactivated packaging product: ${cartonProduct.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'J. Marr product images updated successfully',
        updatedCount,
        totalProducts: jmarrProducts.length,
        crawledProducts: allCrawledProducts.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating J. Marr product images:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update product images',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});