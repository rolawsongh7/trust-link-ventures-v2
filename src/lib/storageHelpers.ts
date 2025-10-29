import { supabase } from '@/integrations/supabase/client';

/**
 * Converts any storage reference into a fresh signed URL
 * Handles: file paths, public URLs, expired signed URLs
 * @param urlOrPath - Storage URL or file path
 * @param expiresIn - Expiry time in seconds (default: 1 hour)
 * @returns Promise<string> - A fresh signed URL
 */
export async function ensureSignedUrl(
  urlOrPath: string, 
  expiresIn: number = 3600  // 1 hour default
): Promise<string> {
  let bucketName = 'invoices';  // Default bucket
  let filePath = urlOrPath;

  // Case 1: Already a signed URL - check if expired
  if (urlOrPath.includes('?token=')) {
    const expMatch = urlOrPath.match(/[&?]exp=(\d+)/);
    if (expMatch) {
      const expiry = parseInt(expMatch[1], 10);
      const now = Math.floor(Date.now() / 1000);
      
      // If not expired and has >5 min remaining, reuse it
      if (expiry > now + 300) {
        console.log('✅ Signed URL still valid, reusing');
        return urlOrPath;
      }
      console.log('⚠️ Signed URL expired, regenerating...');
    }
    
    // Extract file path from expired signed URL
    // Format: .../storage/v1/object/sign/bucket/path?token=...
    const signMatch = urlOrPath.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+?)\?/);
    if (signMatch) {
      bucketName = signMatch[1];
      filePath = decodeURIComponent(signMatch[2]);
      console.log(`📝 Extracted path from expired URL: ${filePath}`);
    }
  }
  
  // Case 2: Public URL format
  else if (urlOrPath.includes('/storage/v1/object/public/')) {
    const publicMatch = urlOrPath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (publicMatch) {
      bucketName = publicMatch[1];
      filePath = decodeURIComponent(publicMatch[2]);
      console.log(`📝 Extracted path from public URL: ${filePath}`);
    }
  }
  
  // Case 3: Plain file path (e.g., "commercial_invoice/INV-123.pdf")
  // Already set as filePath, use default bucket
  else {
    console.log(`📝 Using plain file path: ${filePath}`);
  }

  // Generate fresh signed URL
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('❌ Failed to create signed URL:', error);
      
      // Check if file doesn't exist
      if (error.message?.includes('not found')) {
        throw new Error(`Invoice PDF not found in storage: ${filePath}`);
      }
      
      throw new Error(`Storage error: ${error.message}`);
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL returned from storage');
    }

    console.log(`✅ Generated fresh signed URL (expires in ${expiresIn}s)`);
    return data.signedUrl;
  } catch (error) {
    console.error('❌ Error generating signed URL:', error);
    throw error;  // Don't silently fail
  }
}

/**
 * Opens a storage URL in a new tab, converting to signed URL if needed
 * @param url - The storage URL
 */
export async function openSecureStorageUrl(url: string): Promise<void> {
  try {
    const secureUrl = await ensureSignedUrl(url);
    window.open(secureUrl, '_blank');
  } catch (error) {
    console.error('Failed to open secure URL:', error);
    // Attempt to open original URL as fallback
    window.open(url, '_blank');
  }
}

/**
 * Downloads an invoice PDF using stored URL or regenerating if needed
 * @param invoiceId - The invoice ID
 * @param fileUrl - The stored file URL (may be null or expired)
 * @param invoiceNumber - The invoice number for fallback regeneration
 * @returns Promise<Blob | null> - The PDF blob or null if failed
 */
export async function downloadInvoiceFromUrl(
  invoiceId: string,
  fileUrl: string | null,
  invoiceNumber: string
): Promise<Blob | null> {
  try {
    // If we have a stored URL, try to use it
    if (fileUrl) {
      const secureUrl = await ensureSignedUrl(fileUrl);
      
      const response = await fetch(secureUrl);
      if (response.ok) {
        return await response.blob();
      }
      console.warn('Stored URL failed, regenerating...');
    }
    
    // Fallback: Call edge function to regenerate
    return await regenerateInvoicePdf(invoiceId);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    return null;
  }
}

/**
 * Regenerates an invoice PDF by calling the edge function
 * @param invoiceId - The invoice ID
 * @returns Promise<Blob | null> - The PDF blob or null if failed
 */
async function regenerateInvoicePdf(invoiceId: string): Promise<Blob | null> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const response = await fetch(
    `https://ppyfrftmexvgnsxlhdbz.supabase.co/functions/v1/generate-invoice-pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ invoiceId }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to regenerate PDF: ${errorText}`);
  }

  // Parse JSON response to get file URL
  const data = await response.json();
  
  if (!data.fileUrl) {
    throw new Error('No file URL in response');
  }

  // Download the PDF from the returned URL
  const pdfResponse = await fetch(data.fileUrl);
  if (!pdfResponse.ok) {
    throw new Error('Failed to fetch PDF from storage');
  }
  
  return await pdfResponse.blob();
}
