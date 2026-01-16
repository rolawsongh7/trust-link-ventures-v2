import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Package, Heart, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function CartEmptyState() {
  return (
    <Card className="text-center py-12 px-4 bg-tl-surface border-tl-border shadow-sm">
      <CardContent className="space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-tl-accent/20 to-tl-primary/10 flex items-center justify-center">
          <ShoppingCart className="h-10 w-10 text-tl-accent" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-semibold text-tl-text mb-2">
            Your cart is empty
          </h3>
          <p className="text-tl-muted max-w-md mx-auto">
            Browse our catalog to request a quote for your next delivery.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="bg-tl-gradient hover:opacity-95 text-white min-h-[44px] w-full sm:w-auto">
            <Link to="/portal/catalog">
              <Package className="w-4 h-4 mr-2" />
              Browse Products
            </Link>
          </Button>
          <Button asChild variant="outline" className="min-h-[44px] w-full sm:w-auto">
            <Link to="/portal/favorites">
              <Heart className="w-4 h-4 mr-2" />
              View Favorites
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
