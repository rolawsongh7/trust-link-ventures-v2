import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProductUpdate {
  id: string;
  name: string;
  imageUrl?: string;
  cleanDescription?: string;
}

interface ScrapedProduct {
  name: string;
  imageUrl: string;
  description?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Meat products data from marsea.co.uk/meat
    const meatProducts: ScrapedProduct[] = [
      {
        name: "Chicken Leg Quarters",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-leg-quarters.png",
        description: "Chicken leg quarters from USA and Europe. French/Portuguese Names: Cuisses de poulets, Coxa de frango"
      },
      {
        name: "Chicken Upper Backs",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-UpperBack.png",
        description: "Chicken upper backs from Europe. French/Portuguese Names: Dos de poulets supérieurs, Dorso de frango - cima"
      },
      {
        name: "Chicken Wings 3 Joint – A Grade",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Wings-3J-A.png",
        description: "Grade A chicken wings, 3 joint cut from Europe. French/Portuguese Names: Ailes de poulets, Asa de frango"
      },
      {
        name: "Chicken Wings 3 Joint – B Grade",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Wings-3J-B.png",
        description: "Grade B chicken wings, 3 joint cut from Europe. French/Portuguese Names: Ailes de poulets, Asa de frango"
      },
      {
        name: "Chicken Tails",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Tails.png",
        description: "Chicken tails from Europe. French/Portuguese Names: Croupions de poulet, Rabadilha de frango"
      },
      {
        name: "Chicken Feet",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Feet.png",
        description: "Chicken feet from Europe. French/Portuguese Names: Pattes de poulet, Pé de frango"
      },
      {
        name: "Chicken Drumsticks",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Drumsticks.png",
        description: "Chicken drumsticks from Europe. French/Portuguese Names: Pilons de poulet, Coxa e sobrecoxa de frango"
      },
      {
        name: "Chicken Gizzards",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Gizzards.png",
        description: "Chicken gizzards from Europe. French/Portuguese Names: Gésiers de poulet, Moela de frango"
      },
      {
        name: "Chicken Lower Backs",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-LowerBack.png",
        description: "Chicken lower backs from Europe. French/Portuguese Names: Dos de poulets inférieurs, Dorso de frango - baixo"
      },
      {
        name: "Chicken Franks",
        imageUrl: "https://marsea.co.uk/uploads/images/Chicken-Franks.png",
        description: "Chicken franks/sausages from Europe"
      },
      {
        name: "Whole Hen",
        imageUrl: "https://marsea.co.uk/uploads/images/Whole-Hen.png",
        description: "Whole hen from Europe. French/Portuguese Names: Poule entière, Galinha inteira"
      },
      {
        name: "Hen Leg Quarters",
        imageUrl: "https://marsea.co.uk/uploads/images/Hen-Leg-Quarters.png",
        description: "Hen leg quarters from Europe. French/Portuguese Names: Cuisses de poule, Coxa de galinha"
      },
      {
        name: "Hen Wings",
        imageUrl: "https://marsea.co.uk/uploads/images/Hen-Wings.png",
        description: "Hen wings from Europe. French/Portuguese Names: Ailes de poule, Asa de galinha"
      },
      {
        name: "Rooster Leg Quarters",
        imageUrl: "https://marsea.co.uk/uploads/images/Rooster-Leg-Quarters.png",
        description: "Rooster leg quarters from Europe. French/Portuguese Names: Cuisses de coq, Coxa de galo"
      },
      {
        name: "Turkey Mid Wings",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-Mid-Wings.png",
        description: "Turkey mid wings from Europe. French/Portuguese Names: Ailes de dinde moyennes, Asa de peru média"
      },
      {
        name: "Turkey Necks",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-Necks.png",
        description: "Turkey necks from Europe. French/Portuguese Names: Cous de dinde, Pescoço de peru"
      },
      {
        name: "Turkey Tails",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-Tails.png",
        description: "Turkey tails from Europe. French/Portuguese Names: Croupions de dinde, Rabadilha de peru"
      },
      {
        name: "Turkey 3 Joint Wings",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-3J-Wings.png",
        description: "Turkey wings, 3 joint cut from Europe. French/Portuguese Names: Ailes de dinde 3 articulations, Asa de peru 3 juntas"
      },
      {
        name: "Turkey Drumsticks",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-Drumsticks.png",
        description: "Turkey drumsticks from Europe. French/Portuguese Names: Pilons de dinde, Coxa de peru"
      },
      {
        name: "Turkey Gizzards",
        imageUrl: "https://marsea.co.uk/uploads/images/Turkey-Gizzards.png",
        description: "Turkey gizzards from Europe. French/Portuguese Names: Gésiers de dinde, Moela de peru"
      }
    ];

    // Fish products data from marsea.co.uk/fish
    const fishProducts: ScrapedProduct[] = [
      {
        name: "Hake",
        imageUrl: "https://marsea.co.uk/uploads/images/Hake-3.png",
        description: "Shore frozen hake (Pescada). Latin Name: Merluccius hubbsi. Origin: Argentina"
      },
      {
        name: "Sea Trout",
        imageUrl: "https://marsea.co.uk/uploads/images/Sea_Trout_Ur_Arg_Braz.LARGE.png",
        description: "Shore frozen sea trout (Pescadilla). Latin Name: Cynoscion striatus. Origin: Argentina"
      },
      {
        name: "White Croaker",
        imageUrl: "https://marsea.co.uk/uploads/images/White-Croaker-Pargo-Blanco.png",
        description: "Shore frozen white croaker (Pargo Blanco). Latin Name: Umbrina canosai. Origin: Argentina"
      },
      {
        name: "Yellow Croaker",
        imageUrl: "https://marsea.co.uk/uploads/images/Yellow_Croaker_Ur_Arg_Braz.LARGE.png",
        description: "Shore frozen yellow croaker (Corvina). Latin Name: Micropogonias furnieri. Origin: Argentina"
      },
      {
        name: "Mackerel",
        imageUrl: "https://marsea.co.uk/uploads/images/Mackerel-3.png",
        description: "Shore frozen mackerel. Latin Name: Scomber scombrus. Origin: North Atlantic"
      },
      {
        name: "Blue Mackerel",
        imageUrl: "https://marsea.co.uk/uploads/images/Blue-Mackerel.png",
        description: "Shore frozen blue mackerel. Latin Name: Scomber australasicus. Origin: Chile"
      },
      {
        name: "Horse Mackerel",
        imageUrl: "https://marsea.co.uk/uploads/images/Horse-Mackerel-2.png",
        description: "Shore frozen horse mackerel. Latin Name: Trachurus trachurus. Origin: Chile"
      },
      {
        name: "Tilapia",
        imageUrl: "https://marsea.co.uk/uploads/images/Tilapia-4.png",
        description: "Tilapia, whole round fresh water fish. Latin Name: Oreochromis niloticus. Origin: China"
      },
      {
        name: "Catfish",
        imageUrl: "https://marsea.co.uk/uploads/images/Catfish-2.png",
        description: "Fresh water catfish. Latin Name: Pangasius hypophthalmus. Origin: Vietnam"
      },
      {
        name: "Alaskan Pollock",
        imageUrl: "https://marsea.co.uk/uploads/images/Alaskan-Pollock.png",
        description: "Shore frozen Alaskan pollock. Latin Name: Theragra chalcogramma. Origin: North Pacific"
      }
    ];

    const allProducts = [...meatProducts, ...fishProducts];

    // Get current J. Marr products from database
    const { data: dbProducts, error: fetchError } = await supabase
      .from('supplier_products')
      .select('id, name, description, image_public_url')
      .eq('supplier', 'J. Marr')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch products' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${dbProducts?.length || 0} J. Marr products in database`);

    const updates: ProductUpdate[] = [];

    // Function to normalize product names for matching
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Function to clean descriptions
    const cleanDescription = (description?: string): string => {
      if (!description) return '';
      
      return description
        .replace(/\[Back to top\]/gi, '')
        .replace(/\(https?:\/\/[^\s)]+\)/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .replace(/\\"[^"]*\\"/g, '')
        .replace(/Menu$/gi, '')
        .replace(/back to top/gi, '')
        .replace(/menu/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    // Match database products with scraped products
    for (const dbProduct of dbProducts || []) {
      const normalizedDbName = normalizeName(dbProduct.name);
      
      // Find best match from scraped products
      const match = allProducts.find(scrapedProduct => {
        const normalizedScrapedName = normalizeName(scrapedProduct.name);
        return normalizedDbName.includes(normalizedScrapedName) || 
               normalizedScrapedName.includes(normalizedDbName) ||
               normalizedDbName === normalizedScrapedName;
      });

      if (match) {
        console.log(`Matched: "${dbProduct.name}" -> "${match.name}"`);
        
        updates.push({
          id: dbProduct.id,
          name: dbProduct.name,
          imageUrl: match.imageUrl,
          cleanDescription: cleanDescription(match.description)
        });
      } else {
        // Clean existing description even if no image match
        const cleaned = cleanDescription(dbProduct.description);
        if (cleaned !== dbProduct.description) {
          updates.push({
            id: dbProduct.id,
            name: dbProduct.name,
            cleanDescription: cleaned
          });
        }
      }
    }

    console.log(`Prepared ${updates.length} updates`);

    // Apply updates
    let updatedCount = 0;
    for (const update of updates) {
      const updateData: any = {};
      
      if (update.imageUrl) {
        updateData.image_public_url = update.imageUrl;
      }
      
      if (update.cleanDescription) {
        updateData.description = update.cleanDescription;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('supplier_products')
          .update(updateData)
          .eq('id', update.id);

        if (updateError) {
          console.error(`Error updating product ${update.name}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated: ${update.name}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully updated ${updatedCount} J. Marr products`,
        updatedCount,
        totalProcessed: updates.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in update function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});