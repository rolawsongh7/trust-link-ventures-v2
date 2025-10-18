import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { runMigration } from '@/lib/migratePaymentProofUrls';
import { useToast } from '@/hooks/use-toast';

export default function MigratePaymentProofs() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const handleRunMigration = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const stats = await runMigration();
      setResults(stats);

      if (stats.failed === 0) {
        toast({
          title: 'Migration Successful',
          description: `Migrated ${stats.migrated} payment proof URLs`,
        });
      } else {
        toast({
          title: 'Migration Completed with Warnings',
          description: `${stats.migrated} successful, ${stats.failed} failed`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Migration Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Payment Proof URL Migration
          </CardTitle>
          <CardDescription>
            Convert old public URLs to secure signed URLs for payment proofs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>What does this do?</AlertTitle>
            <AlertDescription>
              This migration converts all payment proof URLs from the old public format
              to secure signed URLs with 1-year expiry. This is necessary because the
              payment-proofs bucket is private for security.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handleRunMigration} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRunning ? 'Migrating...' : 'Run Migration'}
          </Button>

          {results && (
            <Alert className={results.failed === 0 ? 'border-green-500' : 'border-yellow-500'}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Migration Results</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>Total: {results.total}</li>
                  <li>Migrated: {results.migrated}</li>
                  <li>Already Migrated: {results.alreadyMigrated}</li>
                  <li>Failed: {results.failed}</li>
                </ul>
                
                {results.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="font-semibold">Errors:</p>
                    <ul className="list-disc list-inside text-xs">
                      {results.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
