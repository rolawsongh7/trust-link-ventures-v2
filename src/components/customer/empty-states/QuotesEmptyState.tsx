import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QuotesEmptyState() {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-tl-accent/20 to-trustlink-maritime/10 flex items-center justify-center mb-6">
        <FileText className="h-10 w-10 text-tl-accent" />
      </div>
      
      {/* Content */}
      <h3 className="text-xl sm:text-2xl font-semibold text-tl-text mb-2 text-center">
        No quotes yet
      </h3>
      
      <p className="text-center text-tl-muted mb-6 max-w-md">
        Add products to your cart and request a quote to get started with your first order.
      </p>
      
      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          onClick={() => navigate('/portal/catalog')}
          className="bg-tl-gradient hover:opacity-95 text-white min-h-[44px]"
        >
          <Package className="h-4 w-4 mr-2" />
          Browse Products
        </Button>
      </div>
    </div>
  );
}
