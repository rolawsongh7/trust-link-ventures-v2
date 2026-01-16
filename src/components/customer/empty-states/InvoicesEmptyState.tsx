import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Package, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function InvoicesEmptyState() {
  return (
    <Card className="text-center py-12 px-4 bg-tl-surface border-tl-border shadow-sm">
      <CardContent className="space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-tl-accent/20 to-tl-primary/10 flex items-center justify-center">
          <Receipt className="h-10 w-10 text-tl-accent" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-semibold text-tl-text mb-2">
            No invoices available
          </h3>
          <p className="text-tl-muted max-w-md mx-auto">
            Invoices appear here after your orders are processed. Start by placing an order!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="bg-tl-gradient hover:opacity-95 text-white min-h-[44px] w-full sm:w-auto">
            <Link to="/portal/orders">
              <Package className="w-4 h-4 mr-2" />
              View Orders
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
