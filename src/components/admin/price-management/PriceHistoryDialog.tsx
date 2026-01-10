import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriceHistoryDialogProps {
  productId: string | null;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PriceHistoryEntry {
  id: string;
  old_price: number | null;
  new_price: number;
  old_cost_price: number | null;
  new_cost_price: number | null;
  changed_at: string;
  reason: string | null;
}

export const PriceHistoryDialog: React.FC<PriceHistoryDialogProps> = ({
  productId,
  productName,
  open,
  onOpenChange
}) => {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId && open) {
      fetchHistory();
    }
  }, [productId, open]);

  const fetchHistory = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('supplier_product_price_history')
        .select('*')
        .eq('product_id', productId)
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceChange = (oldPrice: number | null, newPrice: number) => {
    if (!oldPrice || oldPrice === 0) return null;
    const change = ((newPrice - oldPrice) / oldPrice) * 100;
    return change;
  };

  const getTrendIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{productName}</p>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No price changes recorded yet</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {history.map((entry) => {
                const priceChange = getPriceChange(entry.old_price, entry.new_price);
                
                return (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {priceChange !== null && (
                        <Badge variant={priceChange > 0 ? 'default' : priceChange < 0 ? 'destructive' : 'secondary'}>
                          {getTrendIcon(priceChange)}
                          <span className="ml-1">
                            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                          </span>
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Price</p>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground line-through">
                            ${entry.old_price?.toFixed(2) || '0.00'}
                          </span>
                          <span>→</span>
                          <span className="font-medium">${entry.new_price.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {(entry.old_cost_price || entry.new_cost_price) && (
                        <div>
                          <p className="text-xs text-muted-foreground">Cost Price</p>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through">
                              ${entry.old_cost_price?.toFixed(2) || '0.00'}
                            </span>
                            <span>→</span>
                            <span className="font-medium">
                              ${entry.new_cost_price?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {entry.reason && (
                      <p className="text-sm text-muted-foreground italic">
                        "{entry.reason}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
