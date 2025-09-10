import React from 'react';
import { Outlet } from 'react-router-dom';
import { SupplierNavigation } from '@/components/supplier/SupplierNavigation';

export const SupplierLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20">
      <SupplierNavigation />
      <main className="py-6">
        <Outlet />
      </main>
    </div>
  );
};