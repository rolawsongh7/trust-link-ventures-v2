import { supabase } from '@/integrations/supabase/client';

export async function verifyCustomerPortalAccess() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { success: false, error: 'Not authenticated' };

    console.log('🔍 Health Check - Starting for user:', user.email);

    // Test 1: Can we read our own customer record?
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .ilike('email', user.email)
      .maybeSingle();

    if (customerError) {
      console.error('❌ Health Check - Cannot read customer table:', customerError);
      return {
        success: false,
        error: 'Cannot read customer table',
        details: customerError
      };
    }

    if (!customer) {
      console.error('❌ Health Check - Customer record not found');
      return {
        success: false,
        error: 'Customer record not found'
      };
    }

    console.log('✅ Health Check - Customer record found:', customer);

    // Test 2: Can we read orders for this customer?
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', customer.id)
      .limit(1);

    if (ordersError) {
      console.error('❌ Health Check - Cannot read orders:', ordersError);
      return {
        success: false,
        error: 'Cannot read orders',
        details: ordersError
      };
    }

    console.log('✅ Health Check - Orders accessible');

    // Test 3: Can we read invoices for this customer?
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .eq('customer_id', customer.id)
      .limit(1);

    if (invoicesError) {
      console.error('❌ Health Check - Cannot read invoices:', invoicesError);
      return {
        success: false,
        error: 'Cannot read invoices',
        details: invoicesError
      };
    }

    console.log('✅ Health Check - Invoices accessible');

    const result = {
      success: true,
      customerId: customer.id,
      orderCount: orders?.length || 0,
      invoiceCount: invoices?.length || 0
    };

    console.log('✅ Health Check - Complete:', result);
    return result;

  } catch (error) {
    console.error('💥 Health Check - Unexpected error:', error);
    return {
      success: false,
      error: 'Unexpected error',
      details: error
    };
  }
}
