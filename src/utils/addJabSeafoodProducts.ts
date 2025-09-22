import { supabase } from '@/integrations/supabase/client';

interface JabProduct {
  name: string;
  imageUrl: string;
  slug: string;
}

export async function addJabSeafoodProducts() {
  try {
    console.log('Adding JAB Brothers seafood products manually...');
    
    const jabProducts: JabProduct[] = [
      {
        name: "Beef Kidneys",
        imageUrl: "/products/jab-beef-kidneys.jpg",
        slug: "jab-brothers-seafood-beef-kidneys"
      },
      {
        name: "Bife Ancho",
        imageUrl: "/products/jab-bife-ancho.jpg", 
        slug: "jab-brothers-seafood-bife-ancho"
      },
      {
        name: "Bife Angosto",
        imageUrl: "/products/jab-bife-angosto.jpg",
        slug: "jab-brothers-seafood-bife-angosto"
      },
      {
        name: "Carne Quijada",
        imageUrl: "/products/jab-carne-quijada.jpg",
        slug: "jab-brothers-seafood-carne-quijada"
      },
      {
        name: "Chicken Drumstick",
        imageUrl: "/products/jab-chicken-drumstick.jpg",
        slug: "jab-brothers-seafood-chicken-drumstick"
      },
      {
        name: "Chicken Gizzards", 
        imageUrl: "/products/jab-chicken-gizzards.jpg",
        slug: "jab-brothers-seafood-chicken-gizzards"
      },
      {
        name: "Chicken Hearts",
        imageUrl: "/products/jab-chicken-hearts.jpg",
        slug: "jab-brothers-seafood-chicken-hearts"
      },
      {
        name: "Chicken Leg Quarter",
        imageUrl: "/products/jab-chicken-leg-quarter.jpg",
        slug: "jab-brothers-seafood-chicken-leg-quarter"
      },
      {
        name: "Chicken Necks",
        imageUrl: "/products/jab-chicken-necks.jpg",
        slug: "jab-brothers-seafood-chicken-necks"
      },
      {
        name: "Chicken Paws",
        imageUrl: "/products/jab-chicken-paws.jpg",
        slug: "jab-brothers-seafood-chicken-paws"
      },
      {
        name: "Chicken Thighs",
        imageUrl: "/products/jab-chicken-thighs.jpg",
        slug: "jab-brothers-seafood-chicken-thighs"
      },
      {
        name: "Chicken Upperbacks",
        imageUrl: "/products/jab-chicken-upperbacks.jpg",
        slug: "jab-brothers-seafood-chicken-upperbacks"
      },
      {
        name: "Chicken Wings",
        imageUrl: "/products/jab-chicken-wings.jpg",
        slug: "jab-brothers-seafood-chicken-wings"
      },
      {
        name: "Chicken",
        imageUrl: "/products/jab-chicken.png",
        slug: "jab-brothers-seafood-chicken"
      },
      {
        name: "Colita de Cuadril",
        imageUrl: "/products/jab-colita-de-cuadril.jpg",
        slug: "jab-brothers-seafood-colita-de-cuadril"
      },
      {
        name: "Corazon",
        imageUrl: "/products/jab-corazon.jpg",
        slug: "jab-brothers-seafood-corazon"
      },
      {
        name: "Grillers",
        imageUrl: "/products/jab-grillers.jpg",
        slug: "jab-brothers-seafood-grillers"
      },
      {
        name: "Grouper",
        imageUrl: "/products/jab-grouper.jpg",
        slug: "jab-brothers-seafood-grouper"
      },
      {
        name: "Hake Hubbsi",
        imageUrl: "/products/jab-hake-hubbsi.jpg",
        slug: "jab-brothers-seafood-hake-hubbsi"
      },
      {
        name: "Higado",
        imageUrl: "/products/jab-higado.jpg",
        slug: "jab-brothers-seafood-higado"
      },
      {
        name: "Illex Squid",
        imageUrl: "/products/jab-illex-squid.jpg",
        slug: "jab-brothers-seafood-illex-squid"
      },
      {
        name: "Lengua",
        imageUrl: "/products/jab-lengua.jpg",
        slug: "jab-brothers-seafood-lengua"
      },
      {
        name: "Librillo",
        imageUrl: "/products/jab-librillo.jpg",
        slug: "jab-brothers-seafood-librillo"
      },
      {
        name: "Lomo",
        imageUrl: "/products/jab-lomo.jpg",
        slug: "jab-brothers-seafood-lomo"
      },
      {
        name: "Mackerel",
        imageUrl: "/products/jab-mackerel.jpg",
        slug: "jab-brothers-seafood-mackerel"
      },
      {
        name: "Mackerel",
        imageUrl: "/products/jab-mackerel.png",
        slug: "jab-brothers-seafood-mackerel-alt"
      },
      {
        name: "Mondongo",
        imageUrl: "/products/jab-mondongo.jpg",
        slug: "jab-brothers-seafood-mondongo"
      },
      {
        name: "Ojo Bife Ancho",
        imageUrl: "/products/jab-ojo-bife-ancho.jpg",
        slug: "jab-brothers-seafood-ojo-bife-ancho"
      },
      {
        name: "Pork Collars",
        imageUrl: "/products/jab-pork-collars.jpg",
        slug: "jab-brothers-seafood-pork-collars"
      },
      {
        name: "Pork Ears",
        imageUrl: "/products/jab-pork-ears.jpg",
        slug: "jab-brothers-seafood-pork-ears"
      },
      {
        name: "Pork Fat",
        imageUrl: "/products/jab-pork-fat.jpg",
        slug: "jab-brothers-seafood-pork-fat"
      },
      {
        name: "Pork Feet",
        imageUrl: "/products/jab-pork-feet.jpg",
        slug: "jab-brothers-seafood-pork-feet"
      },
      {
        name: "Pork Head",
        imageUrl: "/products/jab-pork-head.jpg",
        slug: "jab-brothers-seafood-pork-head"
      },
      {
        name: "Pork Hock",
        imageUrl: "/products/jab-pork-hock.jpg",
        slug: "jab-brothers-seafood-pork-hock"
      },
      {
        name: "Pork Loin Bone In",
        imageUrl: "/products/jab-pork-loin-bone-in.jpg",
        slug: "jab-brothers-seafood-pork-loin-bone-in"
      },
      {
        name: "Pork Mask",
        imageUrl: "/products/jab-pork-mask.jpg",
        slug: "jab-brothers-seafood-pork-mask"
      },
      {
        name: "Pork Ribs",
        imageUrl: "/products/jab-pork-ribs.jpg",
        slug: "jab-brothers-seafood-pork-ribs"
      },
      {
        name: "Pork Snout",
        imageUrl: "/products/jab-pork-snout.jpg",
        slug: "jab-brothers-seafood-pork-snout"
      },
      {
        name: "Pork Tenderloins",
        imageUrl: "/products/jab-pork-tenderloins.jpg",
        slug: "jab-brothers-seafood-pork-tenderloins"
      },
      {
        name: "Pork Tongues",
        imageUrl: "/products/jab-pork-tongues.jpg",
        slug: "jab-brothers-seafood-pork-tongues"
      },
      {
        name: "Prawns",
        imageUrl: "/products/jab-prawns.png",
        slug: "jab-brothers-seafood-prawns"
      },
      {
        name: "Pulmones",
        imageUrl: "/products/jab-pulmones.jpg",
        slug: "jab-brothers-seafood-pulmones"
      },
      {
        name: "Rabo",
        imageUrl: "/products/jab-rabo.jpg",
        slug: "jab-brothers-seafood-rabo"
      },
      {
        name: "Red Porgy",
        imageUrl: "/products/jab-red-porgy.jpg",
        slug: "jab-brothers-seafood-red-porgy"
      },
      {
        name: "Red Shrimps",
        imageUrl: "/products/jab-red-shrimps.jpg",
        slug: "jab-brothers-seafood-red-shrimps"
      },
      {
        name: "Silverside",
        imageUrl: "/products/jab-silverside.jpg",
        slug: "jab-brothers-seafood-silverside"
      },
      {
        name: "Tortuguita",
        imageUrl: "/products/jab-tortuguita.jpg",
        slug: "jab-brothers-seafood-tortuguita"
      },
      {
        name: "White Croaker",
        imageUrl: "/products/jab-white-croaker.jpg",
        slug: "jab-brothers-seafood-white-croaker"
      },
      {
        name: "Yellow Croaker",
        imageUrl: "/products/jab-yellow-croaker.jpg",
        slug: "jab-brothers-seafood-yellow-croaker"
      }
    ];

    // Insert products into database
    const productsToInsert = jabProducts.map(product => ({
      supplier: 'JAB Brothers',
      brand: 'JAB Brothers',
      category: 'Seafood',
      name: product.name,
      slug: product.slug,
      description: null,
      source_url: 'https://www.jab-bros.com.ar/seafood',
      remote_image_url: product.imageUrl,
      image_path: null,
      image_public_url: product.imageUrl,
      is_active: true
    }));

    const { data, error } = await supabase
      .from('supplier_products')
      .upsert(productsToInsert, { onConflict: 'slug' });

    if (error) {
      console.error('Error inserting JAB products:', error);
      throw error;
    }

    console.log('Successfully added JAB Brothers seafood products:', data);
    return { success: true, count: jabProducts.length };
    
  } catch (error) {
    console.error('Failed to add JAB Brothers seafood products:', error);
    throw error;
  }
}