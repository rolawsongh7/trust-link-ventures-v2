import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export const EmptyQuotesState: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-trustlink-maritime/10 p-6 mb-6">
        <FileText className="h-16 w-16 text-trustlink-maritime" />
      </div>
      
      <h3 className="text-2xl font-semibold text-[hsl(var(--tl-text-primary))] mb-2">
        No quotes found
      </h3>
      
      <p className="text-center text-[hsl(var(--tl-text-secondary))] mb-6 max-w-md">
        You haven't requested any quotes yet. Start by creating your first quote request to get pricing from our team.
      </p>
      
      <Button
        onClick={() => navigate('/portal/quote-request')}
        className="bg-gradient-to-r from-trustlink-maritime to-trustlink-navy text-white hover:shadow-md transition-all"
      >
        <Plus className="h-4 w-4 mr-2" />
        Request New Quote
      </Button>
    </div>
  );
};
