import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiItemQuoteRequest } from '@/components/products/MultiItemQuoteRequest';

const QuoteRequest = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <MultiItemQuoteRequest onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
};

export default QuoteRequest;