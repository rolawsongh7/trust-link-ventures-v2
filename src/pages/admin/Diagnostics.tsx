import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DiagnosticResult {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
}

interface DiagnosticCheck {
  name: string;
  description: string;
  run: () => Promise<{ passed: boolean; message: string; warning?: boolean }>;
}

const Diagnostics = () => {
  const { toast } = useToast();
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const diagnosticChecks: DiagnosticCheck[] = [
    {
      name: "Database Connection",
      description: "Verify Supabase database connection is working",
      run: async () => {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        return {
          passed: !error,
          message: error ? `Connection failed: ${error.message}` : "Database connection OK"
        };
      }
    },
    {
      name: "Customer Profile Access",
      description: "Customer can load their profile and addresses",
      run: async () => {
        const { data, error } = await supabase
          .from('customers')
          .select('id, company_name')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Loaded ${data?.length || 0} customer records`
        };
      }
    },
    {
      name: "Customer Addresses Access",
      description: "Customer addresses table is accessible",
      run: async () => {
        const { error } = await supabase
          .from('customer_addresses')
          .select('id')
          .limit(1);
        return {
          passed: !error || error.code === 'PGRST116',
          message: error && error.code !== 'PGRST116' ? error.message : "Customer addresses access OK"
        };
      }
    },
    {
      name: "Cart Items Access",
      description: "Cart functionality is working",
      run: async () => {
        const { error } = await supabase
          .from('cart_items')
          .select('id')
          .limit(1);
        return {
          passed: !error || error.code === 'PGRST116',
          message: error && error.code !== 'PGRST116' ? error.message : "Cart items access OK"
        };
      }
    },
    {
      name: "Quote Requests Access",
      description: "Quote request submission is possible",
      run: async () => {
        const { error } = await supabase
          .from('quote_requests')
          .select('id, status')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : "Quote requests access OK"
        };
      }
    },
    {
      name: "Quotes Access",
      description: "Quotes table is accessible",
      run: async () => {
        const { data, error } = await supabase
          .from('quotes')
          .select('id, quote_number, status')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Found ${data?.length || 0} quotes`
        };
      }
    },
    {
      name: "Quote Items Access",
      description: "Quote items RLS is properly configured",
      run: async () => {
        const { error } = await supabase
          .from('quote_items')
          .select('id')
          .limit(1);
        return {
          passed: !error || error.code === 'PGRST116',
          message: error && error.code !== 'PGRST116' ? error.message : "Quote items access OK"
        };
      }
    },
    {
      name: "Orders Access",
      description: "Orders table is accessible",
      run: async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_number, status')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Found ${data?.length || 0} orders`
        };
      }
    },
    {
      name: "Invoices Access",
      description: "Invoices are accessible",
      run: async () => {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, invoice_number')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Found ${data?.length || 0} invoices`
        };
      }
    },
    {
      name: "Supplier Products RLS",
      description: "Supplier products restricted to admins",
      run: async () => {
        const { data, error } = await supabase
          .from('supplier_products')
          .select('id')
          .limit(1);
        // For admin, this should succeed
        // The key is that it doesn't throw an RLS error for admin
        return {
          passed: !error,
          message: error ? `RLS blocked access: ${error.message}` : "Admin can access supplier products (expected)"
        };
      }
    },
    {
      name: "Order Issues Table",
      description: "Order issues feature is accessible",
      run: async () => {
        const { error } = await supabase
          .from('order_issues')
          .select('id, status')
          .limit(5);
        return {
          passed: !error || error.code === 'PGRST116',
          message: error && error.code !== 'PGRST116' ? error.message : "Order issues access OK"
        };
      }
    },
    {
      name: "Audit Logs",
      description: "Audit logging is functioning",
      run: async () => {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('id, event_type')
          .order('created_at', { ascending: false })
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Found ${data?.length || 0} recent audit logs`
        };
      }
    },
    {
      name: "Notifications System",
      description: "Notifications table is accessible",
      run: async () => {
        const { error } = await supabase
          .from('notifications')
          .select('id')
          .limit(1);
        return {
          passed: !error || error.code === 'PGRST116',
          message: error && error.code !== 'PGRST116' ? error.message : "Notifications access OK"
        };
      }
    },
    {
      name: "Communications Access",
      description: "Communications table is accessible",
      run: async () => {
        const { data, error } = await supabase
          .from('communications')
          .select('id')
          .limit(5);
        return {
          passed: !error,
          message: error ? error.message : `Found ${data?.length || 0} communications`
        };
      }
    }
  ];

  const runAllChecks = async () => {
    setIsRunning(true);
    setResults(diagnosticChecks.map(check => ({
      name: check.name,
      description: check.description,
      status: 'pending' as const,
      message: 'Waiting...'
    })));

    const newResults: DiagnosticResult[] = [];

    for (let i = 0; i < diagnosticChecks.length; i++) {
      const check = diagnosticChecks[i];
      
      // Update status to running
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'running' as const, message: 'Running...' } : r
      ));

      const startTime = Date.now();
      try {
        const result = await check.run();
        const duration = Date.now() - startTime;
        
        newResults.push({
          name: check.name,
          description: check.description,
          status: result.warning ? 'warning' : (result.passed ? 'passed' : 'failed'),
          message: result.message,
          duration
        });
      } catch (err: any) {
        const duration = Date.now() - startTime;
        newResults.push({
          name: check.name,
          description: check.description,
          status: 'failed',
          message: err.message || 'Unknown error',
          duration
        });
      }

      setResults([...newResults, ...diagnosticChecks.slice(i + 1).map(c => ({
        name: c.name,
        description: c.description,
        status: 'pending' as const,
        message: 'Waiting...'
      }))]);
    }

    setResults(newResults);
    setLastRun(new Date());
    setIsRunning(false);

    const passed = newResults.filter(r => r.status === 'passed').length;
    const failed = newResults.filter(r => r.status === 'failed').length;
    const warnings = newResults.filter(r => r.status === 'warning').length;

    toast({
      title: "Diagnostics Complete",
      description: `${passed} passed, ${failed} failed, ${warnings} warnings`,
      variant: failed > 0 ? "destructive" : "default"
    });
  };

  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        name: r.name,
        status: r.status,
        message: r.message,
        duration: r.duration
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-green-100 text-green-800">Passed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            System Diagnostics
          </h1>
          <p className="text-muted-foreground mt-1">
            Run automated checks to verify system health and security
          </p>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <Button variant="outline" onClick={exportResults} disabled={isRunning}>
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          )}
          <Button onClick={runAllChecks} disabled={isRunning}>
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Checks
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Checks</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{passedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Warnings</p>
                  <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Run Time */}
      {lastRun && (
        <p className="text-sm text-muted-foreground">
          Last run: {format(lastRun, 'PPpp')}
        </p>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
            <CardDescription>
              Detailed results from the latest diagnostic run
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(result.status)}
                    <div>
                      <p className="font-medium">{result.name}</p>
                      <p className="text-sm text-muted-foreground">{result.description}</p>
                      {result.message && result.status !== 'pending' && (
                        <p className={`text-xs mt-1 ${
                          result.status === 'failed' ? 'text-red-600' : 
                          result.status === 'warning' ? 'text-yellow-600' : 
                          'text-muted-foreground'
                        }`}>
                          {result.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {result.duration !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                    {getStatusBadge(result.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Diagnostics Run Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run All Checks" to verify system health and security configuration
            </p>
            <Button onClick={runAllChecks}>
              <Play className="h-4 w-4 mr-2" />
              Run All Checks
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Diagnostics;
