import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function FavoritesEmptyState() {
  return (
    <Card className="text-center py-12 px-4 bg-tl-surface border-tl-border shadow-sm">
      <CardContent className="space-y-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-rose-100 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/20 flex items-center justify-center">
          <Heart className="h-10 w-10 text-rose-400" />
        </div>

        {/* Content */}
        <div>
          <h3 className="text-xl font-semibold text-tl-text mb-2">
            Save products you buy often
          </h3>
          <p className="text-tl-muted max-w-md mx-auto">
            Tap the heart icon on products to quickly reorder them later. Build your go-to list!
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
        </div>
      </CardContent>
    </Card>
  );
}
