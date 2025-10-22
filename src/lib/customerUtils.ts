import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a customer record exists and performs case-insensitive email matching
 * to handle potential email case mismatches between auth and customer tables
 */
export async function ensureCustomerRecord(email: string) {
  console.log('🔍 ensureCustomerRecord - Starting lookup for:', email);
  
  // First try exact match
  const { data: exact, error: exactError } = await supabase
    .from('customers')
    .select('id, email, company_name')
    .eq('email', email)
    .maybeSingle();
  
  if (exactError) {
    console.error('❌ Error on exact match:', {
      message: exactError.message,
      code: exactError.code,
      hint: exactError.hint,
      details: exactError.details
    });
    
    // Check if it's an RLS/permission error
    if (exactError.code === 'PGRST116' || exactError.message.includes('permission')) {
      console.error('🚫 RLS POLICY ERROR: Customer cannot read customers table');
    }
  }
  
  if (exact) {
    console.log('✅ Found exact match:', exact);
    return exact;
  }
  
  console.log('⚠️ No exact match, trying case-insensitive...');
  
  // If no exact match, try case-insensitive match
  const { data: caseInsensitive, error: caseError } = await supabase
    .from('customers')
    .select('id, email, company_name')
    .ilike('email', email)
    .maybeSingle();
  
  if (caseError) {
    console.error('❌ Error on case-insensitive match:', {
      message: caseError.message,
      code: caseError.code,
      hint: caseError.hint,
      details: caseError.details
    });
  }
  
  if (caseInsensitive) {
    console.log('✅ Found case-insensitive match:', caseInsensitive);
    return caseInsensitive;
  }
  
  console.error('❌ No customer found for email:', email);
  return null;
}
