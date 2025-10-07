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
    console.log('[Commercial Invoice] Processing order:', orderId);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    // Check if commercial invoice already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('order_id', orderId)
      .eq('invoice_type', 'commercial')
      .maybeSingle();

    if (existing) {
      console.log('[Commercial Invoice] Already exists:', existing.invoice_number);
      return new Response(
        JSON.stringify({ success: true, invoiceId: existing.id, message: 'Commercial invoice already exists' }),
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

    console.log('[Commercial Invoice] Creating invoice for order:', order.order_number);

    // Create commercial invoice
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_type: 'commercial',
        order_id: orderId,
        quote_id: order.quote_id,
        customer_id: order.customer_id,
        subtotal: order.total_amount,
        tax_amount: 0,
        total_amount: order.total_amount,
        currency: order.currency || 'USD',
        status: 'sent',
        payment_terms: '30 days net',
        due_date: dueDate.toISOString().split('T')[0],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create commercial invoice: ${invoiceError.message}`);
    }

    console.log('[Commercial Invoice] Created invoice:', invoice.invoice_number);

    // Create invoice items
    if (order.order_items && order.order_items.length > 0) {
      const invoiceItems = order.order_items.map((item: any) => ({
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
        console.error('[Commercial Invoice] Error creating items:', itemsError);
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
      console.error('[Commercial Invoice] PDF generation failed');
    } else {
      const pdfBuffer = await pdfResponse.arrayBuffer();
      const filePath = `commercial/${invoice.invoice_number}.pdf`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Commercial Invoice] Upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('invoices')
          .getPublicUrl(filePath);

        await supabase
          .from('invoices')
          .update({ file_url: publicUrl })
          .eq('id', invoice.id);

        console.log('[Commercial Invoice] PDF uploaded:', filePath);
      }
    }

    // Trigger email notification with invoice
    try {
      await supabase.functions.invoke('send-invoice-email', {
        body: { invoiceId: invoice.id, orderId },
      });
      console.log('[Commercial Invoice] Email notification sent');
    } catch (emailError) {
      console.error('[Commercial Invoice] Email failed:', emailError);
    }

    return new Response(
      JSON.stringify({ success: true, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Commercial Invoice] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
