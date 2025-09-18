import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, Image } from 'lucide-react';

export const JMarrImageUpdater: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<any>(null);
  const { toast } = useToast();

  const handleUpdateImages = async () => {
    setIsUpdating(true);
    setUpdateResult(null);

    try {
      console.log('Calling J. Marr image update function');
      
      const { data, error } = await supabase.functions.invoke('update-jmarr-product-images', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setUpdateResult(data);
      
      toast({
        title: "Success",
        description: `Updated ${data.updatedCount} product images successfully`,
        duration: 5000,
      });

    } catch (error) {
      console.error('Error updating J. Marr images:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update product images. Please try again.",
        duration: 5000,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          J. Marr Product Image Updater
        </CardTitle>
        <CardDescription>
          Update J. Marr product images to show actual fish/meat instead of packaging/cartons
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>This tool will:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Crawl the J. Marr websites (marsea.co.uk/fish and marsea.co.uk/meat)</li>
            <li>Extract proper product images showing actual fish and meat</li>
            <li>Update products that currently show packaging/cartons</li>
            <li>Hide products that are clearly packaging-only items</li>
          </ul>
        </div>

        <Button 
          onClick={handleUpdateImages} 
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Images...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update J. Marr Product Images
            </>
          )}
        </Button>

        {updateResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Update Results:</h3>
            <div className="text-sm space-y-1">
              <p>• Updated: {updateResult.updatedCount} products</p>
              <p>• Total J. Marr products: {updateResult.totalProducts}</p>
              <p>• Crawled products found: {updateResult.crawledProducts}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};