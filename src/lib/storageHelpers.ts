import { supabase } from '@/integrations/supabase/client';

/**
 * Detects if a URL is an old public format and converts it to a signed URL
 * @param url - The storage URL (could be public or signed format)
 * @returns Promise<string> - A valid signed URL
 */
export async function ensureSignedUrl(url: string): Promise<string> {
  // Already a signed URL (contains ?token= or /sign/)
  if (url.includes('?token=') || url.includes('/sign/')) {
    return url;
  }

  // Extract bucket name and file path from public URL
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  
  if (!publicMatch) {
    console.warn('Could not parse storage URL:', url);
    return url; // Return original if can't parse
  }

  const [, bucketName, filePath] = publicMatch;

  try {
    // Generate signed URL (1 year expiry)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (error) {
      console.error('Failed to create signed URL:', error);
      return url; // Fallback to original URL
    }

    if (!data?.signedUrl) {
      console.error('No signed URL returned');
      return url;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return url;
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
