import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface SummarySideCardProps {
  title: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  currency: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SummarySideCard: React.FC<SummarySideCardProps> = ({
  title,
  subtotal,
  tax,
  discount,
  total,
  currency,
  actions,
  className = '',
}) => {
  return (
    <Card className={`bg-tl-surface border border-tl-border rounded-lg shadow-sm sticky top-6 ${className}`}>
      <CardHeader className="bg-tl-primary/5 border-b border-tl-border">
        <CardTitle className="text-lg text-tl-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Line items */}
        {(subtotal !== undefined || tax !== undefined || discount !== undefined) && (
          <div className="space-y-2 text-sm">
            {subtotal !== undefined && (
              <div className="flex justify-between text-tl-muted">
                <span>Subtotal</span>
                <span className="font-medium text-tl-text">
                  {currency} {subtotal.toLocaleString()}
                </span>
              </div>
            )}
            {tax !== undefined && tax > 0 && (
              <div className="flex justify-between text-tl-muted">
                <span>Tax</span>
                <span className="font-medium text-tl-text">
                  {currency} {tax.toLocaleString()}
                </span>
              </div>
            )}
            {discount !== undefined && discount > 0 && (
              <div className="flex justify-between text-[#2E7D32]">
                <span>Discount</span>
                <span className="font-medium">
                  -{currency} {discount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total */}
        <div className="pt-4 border-t-2 border-tl-gold/30">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-tl-primary">Total</span>
            <span className="text-2xl font-bold text-tl-gold">
              {currency} {total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="space-y-2 pt-4">{actions}</div>}
      </CardContent>
    </Card>
  );
};
