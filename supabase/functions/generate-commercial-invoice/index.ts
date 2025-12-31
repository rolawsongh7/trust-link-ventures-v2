import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const FUNCTION_VERSION = '4.0.0'; // Commercial invoice template update with new layout

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[Commercial Invoice] Function Version: ${FUNCTION_VERSION}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId } = await req.json();
    
    const logContext = {
      orderId,
      timestamp: new Date().toISOString(),
      version: FUNCTION_VERSION
    };
    
    console.log('[Commercial Invoice] Processing order:', logContext);

    if (!orderId) {
      throw new Error('Order ID is required');
    }

    let invoice: any = null;

    // Check if commercial invoice already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id, invoice_number, file_url')
      .eq('order_id', orderId)
      .eq('invoice_type', 'commercial')
      .maybeSingle();

    if (existing) {
      // Check if PDF was already generated
      if (existing.file_url) {
        console.log('[Commercial Invoice] Already exists with PDF:', existing.invoice_number);
        return new Response(
          JSON.stringify({ 
            success: true, 
            invoiceId: existing.id, 
            invoiceNumber: existing.invoice_number,
            fileUrl: existing.file_url,
            message: 'Commercial invoice already exists' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('[Commercial Invoice] Exists but missing PDF, regenerating...');
        invoice = existing;
        
        // Validate invoice object
        if (!invoice || !invoice.id) {
          throw new Error('Invalid invoice data retrieved from database. Invoice object is null or missing ID.');
        }
        
        console.log('[Commercial Invoice] Using existing invoice for regeneration:', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number
        });
      }
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

    // Shipping information is optional - will be shown as "Pending" if not available
    console.log('[Commercial Invoice] Shipping info:', { 
      carrier: order.carrier || 'Pending', 
      tracking: order.tracking_number || 'Pending' 
    });

    // Fetch quote number and tax/shipping info if order has a quote_id
    let quoteNumber = null;
    let taxAmount = 0;
    let shippingFee = 0;
    if (order.quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('quote_number, tax_amount, tax_rate, shipping_fee')
        .eq('id', order.quote_id)
        .single();
      
      quoteNumber = quote?.quote_number || null;
      taxAmount = Number(quote?.tax_amount || 0);
      shippingFee = Number(quote?.shipping_fee || 0);
      
      console.log('[Commercial Invoice] Quote data fetched:', { 
        quoteNumber, 
        taxAmount, 
        shippingFee 
      });
    }

    // Fetch delivery address details
    let deliveryAddress = null;
    if (order.delivery_address_id) {
      const { data: address } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('id', order.delivery_address_id)
        .single();
      
      if (address) {
        deliveryAddress = {
          full_address: `${address.street_address || ''}${address.area ? ', ' + address.area : ''}, ${address.city || ''}, ${address.region || ''} - ${address.ghana_digital_address || ''}`.trim(),
          receiver_name: address.receiver_name,
          phone_number: address.phone_number
        };
      }
    }

    // Only create new invoice if it doesn't exist
    if (!invoice) {
      console.log('[Commercial Invoice] Creating invoice for order:', order.order_number);

      // Calculate totals
      const subtotal = order.order_items.reduce((sum: number, item: any) => 
        sum + (Number(item.total_price) || 0), 0
      );
      // Use tax and shipping from quote if available
      const totalAmount = subtotal + taxAmount + shippingFee;

      // Create commercial invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_type: 'commercial',
          order_id: orderId,
          customer_id: order.customer_id,
          subtotal: subtotal,
          tax_amount: taxAmount,
          shipping_fee: shippingFee,
          total_amount: totalAmount,
          currency: order.currency || 'USD',
          status: 'sent',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sent_at: new Date().toISOString(),
          payment_terms: '30 days',
          notes: `Order: ${order.order_number}${order.payment_method ? `\nPayment Method: ${order.payment_method === 'mobile_money' ? 'Mobile Money' : 'Bank Transfer'}` : ''}${order.payment_reference ? `\nPayment Reference: ${order.payment_reference}` : ''}`,
        })
        .select()
        .single();

      if (invoiceError) {
        throw new Error(`Failed to create commercial invoice: ${invoiceError.message}`);
      }

      invoice = newInvoice;
      console.log('[Commercial Invoice] Created invoice:', invoice.invoice_number);
    } else {
      console.log('[Commercial Invoice] Using existing invoice:', invoice.invoice_number);
    }

    // Check if invoice items already exist
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoice.id)
      .limit(1);

    // Create invoice items only if they don't exist
    if (!existingItems?.length && order.order_items && order.order_items.length > 0) {
      console.log('[Commercial Invoice] Creating invoice items...');
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
        throw new Error(`Failed to create invoice items: ${itemsError.message}`);
      }
      console.log('[Commercial Invoice] Invoice items created');
    } else {
      console.log('[Commercial Invoice] Invoice items already exist');
    }

    // Final validation before PDF generation
    if (!invoice) {
      throw new Error('Invoice object is null. Cannot proceed with PDF generation.');
    }
    
    if (!invoice.id) {
      throw new Error('Invoice ID is missing. Cannot generate PDF.');
    }

    // Generate PDF using the edge function
    console.log('[Commercial Invoice] Calling PDF generation:', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceType: 'commercial',
      quoteNumber: quoteNumber,
      hasDeliveryAddress: !!deliveryAddress
    });
    
    const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', {
      body: { 
        invoiceId: invoice.id,
        invoiceType: 'commercial',
        quoteNumber: quoteNumber,
        deliveryAddress: deliveryAddress
      }
    });

    if (pdfError) {
      const detailedError = `PDF generation failed: ${pdfError.message || 'Unknown error'}`;
      console.error('[Commercial Invoice] PDF generation error:', {
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
      console.error('[Commercial Invoice] No file URL returned:', { pdfData });
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
    
    console.log('[Commercial Invoice] PDF generated successfully:', pdfData.fileUrl);

    // Update invoice with file URL
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ 
        file_url: pdfData.fileUrl,
        status: 'sent'
      })
      .eq('id', invoice.id);

    if (updateError) {
      console.error('[Commercial Invoice] Failed to update invoice with file_url:', updateError);
      throw new Error(`Failed to update invoice: ${updateError.message}`);
    }

    console.log('[Commercial Invoice] Invoice updated with PDF URL');

    // Verify PDF exists in storage
    console.log('[Commercial Invoice] Verifying PDF in storage...');
    const fileParts = pdfData.fileUrl.split('/');
    if (fileParts.length >= 2) {
      const folder = fileParts[0];
      const filename = fileParts[1];
      
      const { data: files, error: verifyError } = await supabase.storage
        .from('invoices')
        .list(folder, { search: filename });

      if (verifyError || !files || files.length === 0) {
        console.error('[Commercial Invoice] PDF verification failed - file not found in storage');
        // Rollback: Delete invoice record if PDF doesn't exist
        await supabase.from('invoices').delete().eq('id', invoice.id);
        throw new Error('PDF file verification failed after generation - invoice rolled back');
      }
      console.log('[Commercial Invoice] PDF verified in storage successfully');
    }

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
        fileUrl: pdfData.fileUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Commercial Invoice] Fatal Error:', {
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
