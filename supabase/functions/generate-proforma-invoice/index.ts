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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { quoteId } = await req.json();
    console.log('[Proforma Invoice] Processing quote:', quoteId);

    if (!quoteId) {
      throw new Error('Quote ID is required');
    }

    // Check if proforma invoice already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('quote_id', quoteId)
      .eq('invoice_type', 'proforma')
      .maybeSingle();

    if (existing) {
      console.log('[Proforma Invoice] Already exists:', existing.invoice_number);
      return new Response(
        JSON.stringify({ success: true, invoiceId: existing.id, message: 'Proforma invoice already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, quote_items(*)')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    console.log('[Proforma Invoice] Creating invoice for quote:', quote.quote_number);

    // Create proforma invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_type: 'proforma',
        quote_id: quoteId,
        customer_id: quote.customer_id,
        subtotal: quote.total_amount,
        tax_amount: 0,
        total_amount: quote.total_amount,
        currency: quote.currency || 'USD',
        status: 'draft',
        payment_terms: '30 days net',
        due_date: dueDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create proforma invoice: ${invoiceError.message}`);
    }

    console.log('[Proforma Invoice] Created invoice:', invoice.invoice_number);

    // Create invoice items
    if (quote.quote_items && quote.quote_items.length > 0) {
      const invoiceItems = quote.quote_items.map((item: any) => ({
        invoice_id: invoice.id,
        product_name: item.product_name,
        description: item.product_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('[Proforma Invoice] Error creating items:', itemsError);
      }
    }

    // Generate PDF using the generate-invoice-pdf function
    const { error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { invoiceId: invoice.id }
    });

    if (pdfError) {
      console.error('[Proforma Invoice] PDF generation failed:', pdfError);
    } else {
      console.log('[Proforma Invoice] PDF generated successfully');
    }

    return new Response(
      JSON.stringify({ success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Proforma Invoice] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
