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
    console.log('[Storage Check] Starting health check...');

    // Get all invoices with file_url
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('invoice_number, file_url')
      .not('file_url', 'is', null);

    if (invoicesError) throw invoicesError;

    const invoicesInDb = invoices?.length || 0;
    const missingPdfs: { invoice_number: string; file_url: string }[] = [];
    let filesInStorage = 0;

    // Check each invoice's PDF in storage
    for (const invoice of invoices || []) {
      const parts = invoice.file_url.split('/');
      if (parts.length < 2) continue;

      const folder = parts[0];
      const filename = parts[1];

      const { data: files, error: listError } = await supabase.storage
        .from('invoices')
        .list(folder, { search: filename });

      if (!listError && files && files.length > 0) {
        filesInStorage++;
      } else {
        missingPdfs.push({
          invoice_number: invoice.invoice_number,
          file_url: invoice.file_url,
        });
      }
    }

    // Get all files in storage buckets
    const allStorageFiles: string[] = [];
    
    for (const folder of ['commercial_invoice', 'packing_list', 'proforma_invoice']) {
      const { data: folderFiles } = await supabase.storage
        .from('invoices')
        .list(folder);

      if (folderFiles) {
        allStorageFiles.push(...folderFiles.map(f => `${folder}/${f.name}`));
      }
    }

    // Find orphaned files (in storage but not in DB)
    const dbFilePaths = (invoices || []).map(i => i.file_url);
    const orphanedFiles = allStorageFiles.filter(file => !dbFilePaths.includes(file));

    const healthReport = {
      invoices_in_db: invoicesInDb,
      files_in_storage: filesInStorage,
      missing_pdfs: missingPdfs,
      orphaned_files: orphanedFiles,
      health_status: missingPdfs.length === 0 ? 'healthy' : 'issues_detected',
      checked_at: new Date().toISOString(),
    };

    console.log('[Storage Check] Health check complete:', {
      invoices_in_db: invoicesInDb,
      files_in_storage: filesInStorage,
      missing_count: missingPdfs.length,
      orphaned_count: orphanedFiles.length,
    });

    return new Response(JSON.stringify(healthReport), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    console.error('[Storage Check] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
