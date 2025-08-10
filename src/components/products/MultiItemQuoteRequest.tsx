import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MultiItemQuoteRequestProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const MultiItemQuoteRequest: React.FC<MultiItemQuoteRequestProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Multi-Item Quote Request</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-muted-foreground mb-4">
        Request quotes for multiple products at once.
      </p>
      <div className="flex gap-2">
        <Button onClick={onSuccess}>Submit Request</Button>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};