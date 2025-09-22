import { supabase } from '@/integrations/supabase/client';

export async function importJabBrothersSeafood() {
  try {
    console.log('Starting JAB Brothers seafood import...');
    
    const { data, error } = await supabase.functions.invoke('import-supplier-catalog', {
      body: {
        supplier: 'JAB Brothers',
        category: 'Seafood',
        url: 'https://www.jab-bros.com.ar/seafood',
        download: true,
        clearExisting: true
      }
    });

    if (error) {
      console.error('Import error:', error);
      throw error;
    }

    console.log('Import successful:', data);
    return data;
  } catch (error) {
    console.error('Failed to import JAB Brothers seafood:', error);
    throw error;
  }
}