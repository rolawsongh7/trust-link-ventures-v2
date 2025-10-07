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

    const { orderId } = await req.json();
    console.log('[Packing List] Processing order:', orderId);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Check if packing list already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('order_id', orderId)
      .eq('invoice_type', 'packing_list')
      .maybeSingle();

    if (existing) {
      console.log('[Packing List] Already exists:', existing.invoice_number);
      return new Response(
        JSON.stringify({ success: true, invoiceId: existing.id, message: 'Packing list already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    console.log('[Packing List] Creating invoice for order:', order.order_number);

    // Create packing list invoice
    const { data: invoice, error: invoiceError } = await supabase
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

    console.log('[Packing List] Created invoice:', invoice.invoice_number);

    // Create invoice items
    if (order.order_items && order.order_items.length > 0) {
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
      }
    }

    // Generate PDF
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });

    if (!pdfResponse.ok) {
      console.error('[Packing List] PDF generation failed');
    } else {
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const filePath = `packing_list/${invoice.invoice_number}.pdf`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Packing List] Upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(filePath);

        await supabase
          .from('invoices')
          .update({ file_url: publicUrl })
          .eq('id', invoice.id);

        console.log('[Packing List] PDF uploaded:', filePath);
      }
    }

    return new Response(
      JSON.stringify({ success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Packing List] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
