import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnostic tool to find duplicate customer records
 */
export async function findDuplicateCustomers() {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, email, company_name, created_at')
      .order('email');

    if (error) throw error;

    // Group by lowercase email
    const emailGroups = new Map<string, typeof customers>();
    
    customers?.forEach(customer => {
      const emailLower = customer.email?.toLowerCase() || '';
      if (!emailGroups.has(emailLower)) {
        emailGroups.set(emailLower, []);
      }
      emailGroups.get(emailLower)?.push(customer);
    });

    // Find duplicates
    const duplicates = Array.from(emailGroups.entries())
      .filter(([_, customers]) => customers.length > 1)
      .map(([email, customers]) => ({
        email,
        count: customers.length,
        customers: customers.map(c => ({
          id: c.id,
          company_name: c.company_name,
          created_at: c.created_at
        }))
      }));

    return {
      success: true,
      duplicates,
      totalCustomers: customers?.length || 0,
      duplicateCount: duplicates.length
    };
  } catch (error) {
    console.error('Error finding duplicates:', error);
    return {
      success: false,
      error,
      duplicates: [],
      totalCustomers: 0,
      duplicateCount: 0
    };
  }
}

/**
 * Get detailed customer information for debugging
 */
export async function getCustomerDebugInfo(email: string) {
  try {
    // Find all customer records with this email
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .ilike('email', email);

    if (customerError) throw customerError;

    // For each customer, get counts of related records
    const customerInfo = await Promise.all(
      (customers || []).map(async (customer) => {
        const [orders, invoices, quotes] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
          supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id),
          supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('customer_id', customer.id)
        ]);

        return {
          ...customer,
          order_count: orders.count || 0,
          invoice_count: invoices.count || 0,
          quote_count: quotes.count || 0
        };
      })
    );

    return {
      success: true,
      email,
      customerCount: customers?.length || 0,
      customers: customerInfo
    };
  } catch (error) {
    console.error('Error getting customer debug info:', error);
    return {
      success: false,
      error,
      email,
      customerCount: 0,
      customers: []
    };
  }
}
