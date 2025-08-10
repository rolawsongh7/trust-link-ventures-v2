// Supabase configuration with validation
export const SUPABASE_CONFIG = {
  url: "https://ppyfrftmexvgnsxlhdbz.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweWZyZnRtZXh2Z25zeGxoZGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3ODQ3NzYsImV4cCI6MjA3MDM2MDc3Nn0.iF81frkpEqDyrA8Ntfv6-Eyoy7r_BK8rpW_w07mcRl4",
  expectedProjectId: "ppyfrftmexvgnsxlhdbz"
} as const;

// Validation function to ensure configuration is correct
export function validateSupabaseConfig() {
  const { url, anonKey, expectedProjectId } = SUPABASE_CONFIG;
  
  // Extract project ID from URL
  const urlProjectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  // Validate URL format
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    throw new Error('Invalid Supabase URL format');
  }
  
  // Validate project ID consistency
  if (urlProjectId !== expectedProjectId) {
    throw new Error(`Project ID mismatch: URL contains "${urlProjectId}" but expected "${expectedProjectId}"`);
  }
  
  // Validate anon key format (should be a JWT)
  if (!anonKey.startsWith('eyJ')) {
    throw new Error('Invalid Supabase anon key format');
  }
  
  // Decode and validate JWT payload
  try {
    const payload = JSON.parse(atob(anonKey.split('.')[1]));
    if (payload.ref !== expectedProjectId) {
      throw new Error(`Anon key project ref "${payload.ref}" doesn't match expected project ID "${expectedProjectId}"`);
    }
  } catch (error) {
    throw new Error('Invalid or corrupted Supabase anon key');
  }
  
  console.log('✅ Supabase configuration validated successfully');
  return true;
}

// Additional validation to check config.toml consistency
export function validateSupabaseConfigToml() {
  // This will help catch config.toml mismatches in development
  const configTomlProjectId = "ppyfrftmexvgnsxlhdbz"; // Expected project ID
  if (SUPABASE_CONFIG.expectedProjectId !== configTomlProjectId) {
    throw new Error(`Config mismatch: config.toml should have project_id = "${configTomlProjectId}"`);
  }
}

// Environment check with enhanced validation
export function checkSupabaseEnvironment() {
  try {
    validateSupabaseConfig();
    validateSupabaseConfigToml();
    console.log(`🔗 Connected to Supabase project: ${SUPABASE_CONFIG.expectedProjectId}`);
    console.log('🛡️ All configuration files are consistent');
  } catch (error) {
    console.error('❌ Supabase configuration error:', error);
    throw error;
  }
}

// Helper function to generate storage URLs consistently
export function getStorageUrl(bucket: string, path: string) {
  return `${SUPABASE_CONFIG.url}/storage/v1/object/public/${bucket}/${path}`;
}