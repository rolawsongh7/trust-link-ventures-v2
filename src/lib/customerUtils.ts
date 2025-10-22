import { supabase } from '@/integrations/supabase/client';

/**
 * Ensures a customer record exists and performs case-insensitive email matching
 * to handle potential email case mismatches between auth and customer tables
 */
export async function ensureCustomerRecord(email: string) {
  // First try exact match
  const { data: exact, error: exactError } = await supabase
    .from('customers')
    .select('id, email, company_name')
    .eq('email', email)
    .maybeSingle();
  
  if (exactError) {
    console.error('Error checking exact customer match:', exactError);
  }
  
  if (exact) {
    return exact;
  }
  
  // If no exact match, try case-insensitive match
  const { data: caseInsensitive, error: caseError } = await supabase
    .from('customers')
    .select('id, email, company_name')
    .ilike('email', email)
    .maybeSingle();
  
  if (caseError) {
    console.error('Error checking case-insensitive customer match:', caseError);
  }
  
  return caseInsensitive || null;
}
