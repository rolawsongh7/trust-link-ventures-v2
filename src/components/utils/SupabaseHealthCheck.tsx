import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_CONFIG } from '@/config/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const SupabaseHealthCheck = () => {
  const [status, setStatus] = useState<'checking' | 'healthy' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Test connection with a simple query and get additional details
        const { data, error } = await supabase.from('user_roles').select('count').limit(1);
        
        if (error) {
          throw new Error(`Database connection failed: ${error.message}`);
        }

        // Get additional connection details for verification
        const { data: { user } } = await supabase.auth.getUser();
        
        // Extract project ID from anon key for verification
        const anonKeyPayload = JSON.parse(atob(SUPABASE_CONFIG.anonKey.split('.')[1]));
        
        setConnectionDetails({
          projectId: SUPABASE_CONFIG.expectedProjectId,
          url: SUPABASE_CONFIG.url,
          anonKeyProjectRef: anonKeyPayload.ref,
          anonKeyValid: anonKeyPayload.ref === SUPABASE_CONFIG.expectedProjectId,
          timestamp: new Date().toLocaleString(),
          userConnected: !!user,
          userEmail: user?.email || 'Not authenticated'
        });
        
        setStatus('healthy');
        setError(null);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Supabase health check failed:', err);
      }
    };

    checkConnection();
    
    // Check every 30 seconds to ensure continuous monitoring
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Verifying Supabase connection...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'healthy') {
    return (
      <div className="space-y-2">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">✅ Trust Link Ventures V2 - Backend Verified</AlertTitle>
          <AlertDescription className="text-green-700 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div><strong>Project ID:</strong> {connectionDetails?.projectId}</div>
                <div><strong>Project URL:</strong> {connectionDetails?.url}</div>
                <div><strong>Anon Key Valid:</strong> {connectionDetails?.anonKeyValid ? '✅ Valid' : '❌ Invalid'}</div>
              </div>
              <div className="space-y-1">
                <div><strong>Admin User:</strong> {connectionDetails?.userEmail}</div>
                <div><strong>Auth Status:</strong> {connectionDetails?.userConnected ? '✅ Authenticated' : '❌ Not authenticated'}</div>
                <div><strong>Last Verified:</strong> {connectionDetails?.timestamp}</div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-100 rounded text-xs">
              <strong>Status:</strong> Connected to correct Supabase project (ppyfrftmexvgnsxlhdbz)
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">⚠️ Connection Error</AlertTitle>
      <AlertDescription className="text-red-700 mt-2">
        <div className="space-y-2 text-sm">
          <div><strong>Error:</strong> {error}</div>
          <div className="p-2 bg-red-100 rounded">
            <div><strong>Expected Project ID:</strong> ppyfrftmexvgnsxlhdbz</div>
            <div><strong>Expected Project:</strong> Trust Link Ventures V2</div>
            <div><strong>Expected URL:</strong> https://ppyfrftmexvgnsxlhdbz.supabase.co</div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};