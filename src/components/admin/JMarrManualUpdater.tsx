import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export const JMarrManualUpdater = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const { toast } = useToast();

  const handleUpdateImages = async () => {
    setIsUpdating(true);
    setUpdateResult(null);

    try {
      console.log('Invoking update-jmarr-manual function...');
      
      const { data, error } = await supabase.functions.invoke('update-jmarr-manual', {
        body: {}
      });

      if (error) {
        console.error('Function invocation error:', error);
        toast({
          title: "Update Failed",
          description: error.message || "Failed to update J. Marr product images",
          variant: "destructive",
        });
        return;
      }

      console.log('Function result:', data);
      setUpdateResult(data);
      
      toast({
        title: "Update Successful",
        description: `Updated ${data.updatedCount} J. Marr products`,
      });
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Update Failed", 
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>J. Marr Product Image & Description Updater</CardTitle>
        <CardDescription>
          Manually update J. Marr product images and clean descriptions using data from marsea.co.uk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>This will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Match database products with correct images from marsea.co.uk</li>
            <li>Update product images to show actual products instead of packaging</li>
            <li>Clean product descriptions to remove unwanted text</li>
            <li>Process both meat/poultry and seafood products</li>
          </ul>
        </div>
        
        <Button 
          onClick={handleUpdateImages}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isUpdating ? 'Updating Products...' : 'Update J. Marr Products'}
        </Button>

        {updateResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800">Update Results:</h4>
            <div className="mt-2 text-sm text-green-700">
              <p>Successfully updated: {updateResult.updatedCount} products</p>
              <p>Total processed: {updateResult.totalProcessed} products</p>
              {updateResult.message && <p className="mt-1 italic">{updateResult.message}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};