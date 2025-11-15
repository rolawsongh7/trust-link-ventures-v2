import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

interface QuoteOriginInfoProps {
  order: {
    source_quote_id?: string;
    manual_confirmation_method?: string;
    manual_confirmation_notes?: string;
    quotes?: {
      quote_number: string;
      title: string;
    };
  };
}

export const QuoteOriginInfo: React.FC<QuoteOriginInfoProps> = ({ order }) => {
  if (!order.source_quote_id) return null;

  return (
    <Card className="border-l-4 border-blue-500">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Quote Origin Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Original Quote</span>
            <p className="font-medium">{order.quotes?.quote_number}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Quote Title</span>
            <p className="font-medium">{order.quotes?.title}</p>
          </div>
          {order.manual_confirmation_method && (
            <div>
              <span className="text-sm text-muted-foreground">Confirmation Method</span>
              <Badge variant="outline" className="mt-1">{order.manual_confirmation_method}</Badge>
            </div>
          )}
          {order.manual_confirmation_notes && (
            <div className="col-span-2">
              <span className="text-sm text-muted-foreground">Confirmation Notes</span>
              <p className="text-sm mt-1 p-3 bg-muted rounded-md">
                {order.manual_confirmation_notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};