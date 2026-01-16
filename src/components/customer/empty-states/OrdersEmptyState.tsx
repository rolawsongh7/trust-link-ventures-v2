import React from 'react';
import { Link } from 'react-router-dom';
import { Package, FileText, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface OrdersEmptyStateProps {
  filtered?: boolean;
  onClearFilters?: () => void;
}

export function OrdersEmptyState({ filtered = false, onClearFilters }: OrdersEmptyStateProps) {
  if (filtered) {
    return (
      <Card className="text-center py-12 px-4 bg-tl-surface border-tl-border shadow-sm">
        <CardContent className="space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted/30 flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-tl-text mb-1">
              No orders found
            </h3>
            <p className="text-tl-muted text-sm">
              No orders match your current filters.
            </p>
          </div>
          {onClearFilters && (
            <Button variant="outline" onClick={onClearFilters} className="min-h-[44px]">
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="text-center py-12 px-4 bg-tl-surface border-tl-border shadow-sm">
      <CardContent className="space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-tl-accent/20 to-tl-primary/10 flex items-center justify-center">
          <ShoppingBag className="h-10 w-10 text-tl-accent" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-semibold text-tl-text mb-2">
            No orders yet
          </h3>
          <p className="text-tl-muted max-w-md mx-auto">
            Accept a quote to place your first order with Trust Link. We'll handle the rest!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="bg-tl-gradient hover:opacity-95 text-white min-h-[44px] w-full sm:w-auto">
            <Link to="/portal/quotes">
              <FileText className="w-4 h-4 mr-2" />
              View Quotes
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
            <Link to="/portal/catalog">
              <Package className="w-4 h-4 mr-2" />
              Browse Products
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
