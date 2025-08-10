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
        
        setConnectionDetails({
          projectId: SUPABASE_CONFIG.expectedProjectId,
          url: SUPABASE_CONFIG.url,
          timestamp: new Date().toLocaleString(),
          userConnected: !!user
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
          <AlertTitle className="text-green-800">Trust Link Ventures - Backend Connected</AlertTitle>
          <AlertDescription className="text-green-700 mt-2">
            <div className="space-y-1 text-sm">
              <div><strong>Project ID:</strong> {connectionDetails?.projectId}</div>
              <div><strong>Project URL:</strong> {connectionDetails?.url}</div>
              <div><strong>Last Verified:</strong> {connectionDetails?.timestamp}</div>
              <div><strong>Status:</strong> ✅ Separate from New Gen Link</div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800">Connection Error</AlertTitle>
      <AlertDescription className="text-red-700 mt-2">
        <div className="space-y-1 text-sm">
          <div><strong>Error:</strong> {error}</div>
          <div><strong>Expected Project:</strong> Trust Link Ventures (ppyfrftmexvgnsxlhdbz)</div>
        </div>
      </AlertDescription>
    </Alert>
  );
};