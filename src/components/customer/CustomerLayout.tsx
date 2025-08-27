import React from 'react';
import { CustomerNavigation } from '@/components/customer/CustomerNavigation';

interface CustomerLayoutProps {
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <CustomerNavigation />
      <main className="py-6">
        {children}
      </main>
    </div>
  );
};