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
