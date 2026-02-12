import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { StandingOrdersList } from '@/components/subscriptions';

const StandingOrdersPage = () => {
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
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Standing Orders</h1>
          <p className="text-muted-foreground">Manage recurring procurement schedules</p>
        </div>
        <StandingOrdersList />
      </div>
    </div>
  );
};

export default StandingOrdersPage;
