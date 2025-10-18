import { supabase } from '@/integrations/supabase/client';

interface OrderWithPaymentProof {
  id: string;
  order_number: string;
  payment_proof_url: string;
}

/**
 * Migrates all old public-format payment proof URLs to signed URLs
 * @returns Migration statistics
 */
export async function migratePaymentProofUrls() {
  const stats = {
    total: 0,
    migrated: 0,
    alreadyMigrated: 0,
    failed: 0,
    errors: [] as string[]
  };

  try {
    // Fetch all orders with payment proof URLs
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, payment_proof_url')
      .not('payment_proof_url', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!orders || orders.length === 0) {
      console.log('No orders with payment proofs found');
      return stats;
    }

    stats.total = orders.length;
    console.log(`Found ${stats.total} orders with payment proofs`);

    for (const order of orders as OrderWithPaymentProof[]) {
      try {
        // Skip if already a signed URL
        if (order.payment_proof_url.includes('?token=') || 
            order.payment_proof_url.includes('/sign/')) {
          stats.alreadyMigrated++;
          console.log(`✓ ${order.order_number}: Already migrated`);
          continue;
        }

        // Extract file path from public URL
        const publicMatch = order.payment_proof_url.match(
          /\/storage\/v1\/object\/public\/payment-proofs\/(.+)/
        );

        if (!publicMatch) {
          stats.failed++;
          stats.errors.push(`${order.order_number}: Could not parse URL`);
          console.error(`✗ ${order.order_number}: Invalid URL format`);
          continue;
        }

        const filePath = publicMatch[1];

        // Generate signed URL
        const { data: signedData, error: signError } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(filePath, 31536000); // 1 year

        if (signError || !signedData?.signedUrl) {
          stats.failed++;
          stats.errors.push(`${order.order_number}: ${signError?.message || 'No signed URL'}`);
          console.error(`✗ ${order.order_number}: Failed to generate signed URL`);
          continue;
        }

        // Update order with new signed URL
        const { error: updateError } = await supabase
          .from('orders')
          .update({ payment_proof_url: signedData.signedUrl })
          .eq('id', order.id);

        if (updateError) {
          stats.failed++;
          stats.errors.push(`${order.order_number}: ${updateError.message}`);
          console.error(`✗ ${order.order_number}: Update failed`);
          continue;
        }

        stats.migrated++;
        console.log(`✓ ${order.order_number}: Migrated successfully`);

      } catch (error: any) {
        stats.failed++;
        stats.errors.push(`${order.order_number}: ${error.message}`);
        console.error(`✗ ${order.order_number}: Error:`, error);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total: ${stats.total}`);
    console.log(`Migrated: ${stats.migrated}`);
    console.log(`Already Migrated: ${stats.alreadyMigrated}`);
    console.log(`Failed: ${stats.failed}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(err => console.log(`  - ${err}`));
    }

    return stats;

  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Run migration - can be called from browser console or as a script
 */
export async function runMigration() {
  console.log('Starting payment proof URL migration...');
  
  try {
    const stats = await migratePaymentProofUrls();
    
    if (stats.failed > 0) {
      console.warn(`⚠️ Migration completed with ${stats.failed} failures`);
    } else {
      console.log('✅ Migration completed successfully!');
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
