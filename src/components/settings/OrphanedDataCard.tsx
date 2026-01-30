import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  RefreshCw,
  FileText,
  ShoppingCart,
  Receipt,
  File,
  Download,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRoleAuth } from '@/hooks/useRoleAuth';
import { format } from 'date-fns';

interface OrphanedData {
  quotes_without_requests: number;
  orders_without_customers: number;
  invoices_orphaned: number;
  files_orphaned: number;
  total: number;
}

interface DetectionResult {
  success: boolean;
  detected_at: string;
  orphaned_data: OrphanedData;
}

export const OrphanedDataCard = () => {
  const { hasSuperAdminAccess } = useRoleAuth();
  const { toast } = useToast();
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runDetection = async () => {
    if (!hasSuperAdminAccess) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('detect_orphaned_data');
      if (error) throw error;
      
      const resultData = data as unknown as DetectionResult;
      setResult(resultData);
      
      toast({
        title: 'Detection Complete',
        description: `Found ${resultData.orphaned_data.total} orphaned records.`,
      });
    } catch (error: any) {
      console.error('Failed to detect orphaned data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to run orphaned data detection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!result) return;
    
    const report = {
      generated_at: new Date().toISOString(),
      detected_at: result.detected_at,
      summary: result.orphaned_data,
      recommendations: [
        result.orphaned_data.quotes_without_requests > 0 
          ? 'Review quotes without linked quote requests - may need manual linking'
          : null,
        result.orphaned_data.orders_without_customers > 0 
          ? 'Orders without customers need attention - may indicate data integrity issues'
          : null,
        result.orphaned_data.invoices_orphaned > 0 
          ? 'Orphaned invoices should be reviewed and linked to orders/customers'
          : null,
        result.orphaned_data.files_orphaned > 0 
          ? 'Files without valid user references may need cleanup'
          : null,
      ].filter(Boolean)
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orphaned-data-report-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Report Exported',
      description: 'Orphaned data report has been downloaded.',
    });
  };

  if (!hasSuperAdminAccess) return null;

  const getStatusIcon = (count: number) => {
    return count === 0 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertTriangle className="h-4 w-4 text-orange-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Data Health Check
        </CardTitle>
        <CardDescription>
          Detect orphaned records without making any changes. Export reports for review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <>
            <Alert className={result.orphaned_data.total === 0 ? 'border-green-500/50' : 'border-orange-500/50'}>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {result.orphaned_data.total === 0 
                      ? '✓ No orphaned data detected'
                      : `Found ${result.orphaned_data.total} orphaned records`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Last checked: {format(new Date(result.detected_at), 'PPp')}
                  </span>
                </div>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Quotes without requests</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.orphaned_data.quotes_without_requests)}
                  <Badge variant={result.orphaned_data.quotes_without_requests > 0 ? 'secondary' : 'outline'}>
                    {result.orphaned_data.quotes_without_requests}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Orders without customers</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.orphaned_data.orders_without_customers)}
                  <Badge variant={result.orphaned_data.orders_without_customers > 0 ? 'secondary' : 'outline'}>
                    {result.orphaned_data.orders_without_customers}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Orphaned invoices</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.orphaned_data.invoices_orphaned)}
                  <Badge variant={result.orphaned_data.invoices_orphaned > 0 ? 'secondary' : 'outline'}>
                    {result.orphaned_data.invoices_orphaned}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Orphaned files</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.orphaned_data.files_orphaned)}
                  <Badge variant={result.orphaned_data.files_orphaned > 0 ? 'secondary' : 'outline'}>
                    {result.orphaned_data.files_orphaned}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Run a scan to detect orphaned data</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={runDetection} disabled={loading} className="flex-1">
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Run Detection
              </>
            )}
          </Button>
          {result && result.orphaned_data.total > 0 && (
            <Button onClick={exportReport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
