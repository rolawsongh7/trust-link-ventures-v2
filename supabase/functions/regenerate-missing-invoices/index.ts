import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[Regenerate Missing PDFs] Starting scan...');

    // Fetch all invoices with file_url
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, invoice_type, file_url, order_id')
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Regenerate] Error fetching invoices:', error);
      throw error;
    }

    const results = {
      total: invoices?.length || 0,
      missing: [] as string[],
      regenerated: [] as string[],
      failed: [] as { invoice: string; reason: string }[],
      already_exists: [] as string[],
    };

    console.log(`[Regenerate] Found ${results.total} invoices with file_url`);

    for (const invoice of invoices || []) {
      try {
        // Extract folder and filename from file_url
        const parts = invoice.file_url.split('/');
        if (parts.length < 2) {
          console.error(`[Regenerate] Invalid file_url format: ${invoice.file_url}`);
          results.failed.push({
            invoice: invoice.invoice_number,
            reason: 'Invalid file_url format',
          });
          continue;
        }

        const folder = parts[0];
        const filename = parts[1];

        console.log(`[Regenerate] Checking ${invoice.invoice_number}: ${folder}/${filename}`);

        // Check if file exists in storage
        const { data: files, error: listError } = await supabase.storage
          .from('invoices')
          .list(folder, {
            search: filename,
          });

        if (listError) {
          console.error(`[Regenerate] Storage list error for ${invoice.invoice_number}:`, listError);
          results.missing.push(invoice.invoice_number);
        } else if (!files || files.length === 0) {
          console.log(`[Regenerate] PDF missing for ${invoice.invoice_number}, will regenerate`);
          results.missing.push(invoice.invoice_number);
          
          // Check if invoice has items
          const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('id')
            .eq('invoice_id', invoice.id);

          if (itemsError || !items || items.length === 0) {
            console.error(`[Regenerate] No invoice items found for ${invoice.invoice_number}`);
            results.failed.push({
              invoice: invoice.invoice_number,
              reason: 'No invoice items found - cannot regenerate',
            });
            continue;
          }

          // Regenerate PDF by calling generate-invoice-pdf
          console.log(`[Regenerate] Calling generate-invoice-pdf for ${invoice.invoice_number}`);
          
          const { data: pdfData, error: genError } = await supabase.functions.invoke(
            'generate-invoice-pdf',
            {
              body: {
                invoiceId: invoice.id,
                invoiceType: invoice.invoice_type,
              },
            }
          );

          if (genError) {
            console.error(`[Regenerate] PDF generation failed for ${invoice.invoice_number}:`, genError);
            results.failed.push({
              invoice: invoice.invoice_number,
              reason: genError.message || 'PDF generation failed',
            });
          } else {
            console.log(`[Regenerate] Successfully regenerated ${invoice.invoice_number}`);
            results.regenerated.push(invoice.invoice_number);
          }
        } else {
          console.log(`[Regenerate] PDF already exists for ${invoice.invoice_number}`);
          results.already_exists.push(invoice.invoice_number);
        }
      } catch (error) {
        console.error(`[Regenerate] Error processing ${invoice.invoice_number}:`, error);
        results.failed.push({
          invoice: invoice.invoice_number,
          reason: error.message || 'Unknown error',
        });
      }
    }

    console.log('[Regenerate] Scan complete:', results);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[Regenerate] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
