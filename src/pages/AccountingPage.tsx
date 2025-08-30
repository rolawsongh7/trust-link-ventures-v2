import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AccountingPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Accounting</h2>
            <p className="text-muted-foreground">
              Financial management and accounting features
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-2">Invoicing</h3>
              <p className="text-muted-foreground mb-4">
                Create and manage customer invoices
              </p>
              <div className="text-2xl font-bold text-primary">Coming Soon</div>
            </div>
            
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-2">Payments</h3>
              <p className="text-muted-foreground mb-4">
                Track customer payments and receivables
              </p>
              <div className="text-2xl font-bold text-primary">Coming Soon</div>
            </div>
            
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-2">Financial Reports</h3>
              <p className="text-muted-foreground mb-4">
                Generate financial statements and reports
              </p>
              <div className="text-2xl font-bold text-primary">Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingPage;