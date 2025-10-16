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
      .select('id, invoice_number, file_url')
      .eq('order_id', orderId)
      .eq('invoice_type', 'commercial')
      .maybeSingle();

    if (existing) {
      console.log('[Commercial Invoice] Already exists:', existing.invoice_number);
      return new Response(
        JSON.stringify({ 
          success: true, 
          invoiceId: existing.id, 
          fileUrl: existing.file_url,
          message: 'Commercial invoice already exists' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order with items and customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*),
        customers(*)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Validate delivery address exists
    if (!order.delivery_address_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot generate commercial invoice without delivery address. Please request delivery address from customer first.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate shipping information
    if (!order.carrier || !order.tracking_number) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot generate commercial invoice without shipping information (carrier and tracking number).' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Commercial Invoice] Creating invoice for order:', order.order_number);

    // Calculate totals
    const subtotal = order.order_items.reduce((sum: number, item: any) => 
      sum + (Number(item.total_price) || 0), 0
    );
    const taxAmount = 0; // Configure tax calculation as needed
    const totalAmount = subtotal + taxAmount;

    // Create commercial invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_type: 'commercial',
        order_id: orderId,
        customer_id: order.customer_id,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: order.currency || 'USD',
        status: 'sent',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        sent_at: new Date().toISOString(),
        payment_terms: '30 days',
        notes: `Order: ${order.order_number}\nCarrier: ${order.carrier}\nTracking: ${order.tracking_number}`,
      })
      .select()
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create commercial invoice: ${invoiceError.message}`);
    }

    console.log('[Commercial Invoice] Created invoice:', invoice.invoice_number);

    // Create invoice items from order items
    if (order.order_items && order.order_items.length > 0) {
      const invoiceItems = order.order_items.map((item: any) => ({
        invoice_id: invoice.id,
        product_name: item.product_name,
        description: item.product_description || item.specifications,
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
    console.log('[Commercial Invoice] Requesting PDF generation...');
    const pdfResponse = await fetch(`${supabaseUrl}/functions/v1/generate-invoice-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ invoiceId: invoice.id }),
    });

    let fileUrl = null;

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('[Commercial Invoice] PDF generation failed:', pdfResponse.status, errorText);
      throw new Error(`PDF generation failed: ${pdfResponse.status} ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('[Commercial Invoice] PDF generated, size:', pdfBuffer.byteLength);
    
    const filePath = `commercial_invoice/${invoice.invoice_number}.pdf`;

    // Upload to storage
    console.log('[Commercial Invoice] Uploading to storage:', filePath);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Commercial Invoice] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[Commercial Invoice] Upload successful:', uploadData);
    
    const { data: { publicUrl } } = supabase.storage
      .from('invoices')
      .getPublicUrl(filePath);

    console.log('[Commercial Invoice] Public URL:', publicUrl);

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ file_url: publicUrl })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('[Commercial Invoice] Failed to update invoice with file_url:', updateError);
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    fileUrl = publicUrl;
    console.log('[Commercial Invoice] PDF uploaded successfully:', filePath);

    // Send commercial invoice email notification
    if (order.customers?.email) {
      try {
        await supabase.functions.invoke('send-commercial-invoice-email', {
          body: { 
            invoiceId: invoice.id, 
            orderId,
            customerEmail: order.customers.email,
          },
        });
        console.log('[Commercial Invoice] Email notification sent');
      } catch (emailError) {
        console.error('[Commercial Invoice] Email failed:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoiceId: invoice.id, 
        invoiceNumber: invoice.invoice_number,
        fileUrl: fileUrl,
      }),
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
