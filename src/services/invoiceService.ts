import { supabase } from '@/integrations/supabase/client';

export class InvoiceService {
  /**
   * Generate proforma invoice when quote is accepted
   */
  static async generateProformaInvoice(quoteId: string): Promise<string | null> {
    try {
      // Get quote and order data
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, quote_items(*), customers(*)')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        console.error('Error fetching quote:', quoteError);
        return null;
      }

      // CRITICAL: Validate currency is set
      if (!quote.currency) {
        console.error('Quote currency is NULL for quote:', quoteId);
        throw new Error('Cannot generate proforma invoice: Quote has no currency set');
      }

      // Check if proforma invoice already exists
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('quote_id', quoteId)
        .eq('invoice_type', 'proforma')
        .maybeSingle();

      if (existing) {
        console.log('Proforma invoice already exists');
        return existing.id;
      }

      // Create proforma invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: '',
          invoice_type: 'proforma' as any,
          quote_id: quoteId,
          customer_id: quote.customer_id,
          subtotal: quote.total_amount,
          tax_amount: 0,
          total_amount: quote.total_amount,
          currency: quote.currency, // No fallback - validated above
          status: 'draft' as any,
          payment_terms: '30 days net',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return null;
      }

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
          console.error('Error creating invoice items:', itemsError);
        }
      }

      return invoice.id;
    } catch (error) {
      console.error('Error generating proforma invoice:', error);
      return null;
    }
  }

  /**
   * Generate commercial invoice when order is shipped
   */
  static async generateCommercialInvoice(orderId: string): Promise<string | null> {
    try {
      // Check if commercial invoice already exists
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .eq('invoice_type', 'commercial')
        .maybeSingle();

      if (existing) {
        console.log('Commercial invoice already exists');
        return existing.id;
      }

      // Get order data
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return null;
      }

      // CRITICAL: Validate currency is set
      if (!order.currency) {
        console.error('Order currency is NULL for order:', orderId);
        throw new Error('Cannot generate commercial invoice: Order has no currency set');
      }

      // Create commercial invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: '',
          invoice_type: 'commercial' as any,
          order_id: orderId,
          quote_id: order.quote_id,
          customer_id: order.customer_id,
          subtotal: order.total_amount,
          tax_amount: 0,
          total_amount: order.total_amount,
          currency: order.currency, // No fallback - validated above
          status: 'sent' as any,
          payment_terms: '30 days net',
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sent_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return null;
      }

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
          console.error('Error creating invoice items:', itemsError);
        }
      }

      return invoice.id;
    } catch (error) {
      console.error('Error generating commercial invoice:', error);
      return null;
    }
  }

  /**
   * Generate packing list when order is ready to ship
   */
  static async generatePackingList(orderId: string): Promise<string | null> {
    try {
      // Check if packing list already exists
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .eq('invoice_type', 'packing_list')
        .maybeSingle();

      if (existing) {
        console.log('Packing list already exists');
        return existing.id;
      }

      // Get order data
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (orderError || !order) {
        console.error('Error fetching order:', orderError);
        return null;
      }

      // CRITICAL: Validate currency is set
      if (!order.currency) {
        console.error('Order currency is NULL for order:', orderId);
        throw new Error('Cannot generate packing list: Order has no currency set');
      }

      // Create packing list
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: '',
          invoice_type: 'packing_list' as any,
          order_id: orderId,
          customer_id: order.customer_id,
          subtotal: 0,
          tax_amount: 0,
          total_amount: 0,
          currency: order.currency, // No fallback - validated above
          status: 'sent' as any,
          sent_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (invoiceError) {
        console.error('Error creating packing list:', invoiceError);
        return null;
      }

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
          console.error('Error creating packing list items:', itemsError);
        }
      }

      return invoice.id;
    } catch (error) {
      console.error('Error generating packing list:', error);
      return null;
    }
  }

  /**
   * Download invoice PDF
   */
  static async downloadInvoice(invoiceId: string): Promise<Blob | null> {
    try {
      // Use direct fetch to get PDF blob
      const response = await fetch(
        `https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/generate-invoice-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      return null;
    }
  }

  /**
   * Mark invoice as paid
   */
  static async markAsPaid(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error marking invoice as paid:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      return false;
    }
  }
}
