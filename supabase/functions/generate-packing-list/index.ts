import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const FUNCTION_VERSION = '3.2.0'; // Force complete redeployment with API key debugging

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[Packing List] Function Version: ${FUNCTION_VERSION}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId } = await req.json();
    
    const logContext = {
      orderId,
      timestamp: new Date().toISOString(),
      version: FUNCTION_VERSION
    };
    
    console.log('[Packing List] Processing order:', logContext);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    let invoice: any = null;

    // Check if packing list already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number, file_url')
      .eq('order_id', orderId)
      .eq('invoice_type', 'packing_list')
      .maybeSingle();

    if (existing) {
      // Check if PDF was already generated
      if (existing.file_url) {
        console.log('[Packing List] Already exists with PDF:', existing.invoice_number);
        return new Response(
          JSON.stringify({ 
            success: true, 
            invoiceId: existing.id, 
            invoiceNumber: existing.invoice_number,
            fileUrl: existing.file_url,
            message: 'Packing list already exists' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('[Packing List] Exists but missing PDF, regenerating...');
        invoice = existing;
        
        // Validate invoice object
        if (!invoice || !invoice.id) {
          throw new Error('Invalid invoice data retrieved from database. Invoice object is null or missing ID.');
        }
        
        console.log('[Packing List] Using existing invoice for regeneration:', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number
        });
      }
    }

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Validate delivery address exists
    if (!order.delivery_address_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot generate packing list without delivery address. Please request delivery address from customer first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only create new invoice if it doesn't exist
    if (!invoice) {
      console.log('[Packing List] Creating invoice for order:', order.order_number);

      // Create packing list invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_type: 'packing_list',
          order_id: orderId,
          customer_id: order.customer_id,
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          currency: order.currency || 'USD',
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Failed to create packing list: ${invoiceError.message}`);
      }

      invoice = newInvoice;
      console.log('[Packing List] Created invoice:', invoice.invoice_number);
    } else {
      console.log('[Packing List] Using existing invoice:', invoice.invoice_number);
    }

    // Check if invoice items already exist
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoice.id)
      .limit(1);

    // Create invoice items only if they don't exist
    if (!existingItems?.length && order.order_items && order.order_items.length > 0) {
      console.log('[Packing List] Creating invoice items...');
      const invoiceItems = order.order_items.map((item: any) => ({
        invoice_id: invoice.id,
        product_name: item.product_name,
        description: item.product_description || item.specifications,
        quantity: item.quantity,
        unit_price: 0,
        total_price: 0,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        console.error('[Packing List] Error creating items:', itemsError);
        throw new Error(`Failed to create invoice items: ${itemsError.message}`);
      }
      console.log('[Packing List] Invoice items created');
    } else {
      console.log('[Packing List] Invoice items already exist');
    }

    // Final validation before PDF generation
    if (!invoice) {
      throw new Error('Invoice object is null. Cannot proceed with PDF generation.');
    }
    
    if (!invoice.id) {
      throw new Error('Invoice ID is missing. Cannot generate PDF.');
    }

    // Generate PDF using the edge function
    console.log('[Packing List] Calling PDF generation:', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceType: 'packing_list'
    });
    
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { 
        invoiceId: invoice.id,
        invoiceType: 'packing_list'
      }
    });

    if (pdfError) {
      const detailedError = `PDF generation failed: ${pdfError.message || 'Unknown error'}`;
      console.error('[Packing List] PDF generation error:', {
        error: pdfError.message,
        context: pdfError.context,
        invoiceId: invoice.id
      });
      
      return new Response(
        JSON.stringify({ 
          error: detailedError,
          details: pdfError.message,
          invoiceId: invoice.id,
          version: FUNCTION_VERSION
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!pdfData?.fileUrl) {
      console.error('[Packing List] No file URL returned:', { pdfData });
      return new Response(
        JSON.stringify({ 
          error: 'PDF generation returned no file URL',
          pdfData,
          version: FUNCTION_VERSION
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[Packing List] PDF generated successfully:', pdfData.fileUrl);

    // Update invoice with file URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        file_url: pdfData.fileUrl,
        status: 'sent'
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('[Packing List] Failed to update invoice with file_url:', updateError);
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    console.log('[Packing List] Invoice updated with PDF URL');

    // Send packing list email notification
    try {
      await supabase.functions.invoke('send-packing-list-email', {
        body: { invoiceId: invoice.id, orderId },
      });
      console.log('[Packing List] Email notification sent');
    } catch (emailError) {
      console.error('[Packing List] Email failed:', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoiceId: invoice.id, 
        invoiceNumber: invoice.invoice_number,
        fileUrl: pdfData.fileUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Packing List] Fatal Error:', {
      error: error.message,
      stack: error.stack,
      version: FUNCTION_VERSION,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        version: FUNCTION_VERSION,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
