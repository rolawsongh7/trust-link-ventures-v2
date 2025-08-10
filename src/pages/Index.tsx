import React, { useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, signOut, loading } = useAuth();

  // Redirect to auth page if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Trust Link Ventures</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>CRM Dashboard</CardTitle>
              <CardDescription>
                Manage customers, leads, and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access your customer relationship management tools and track sales progress.
              </p>
              <Button className="w-full">Open CRM</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Management</CardTitle>
              <CardDescription>
                Create and manage quotes for customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate professional quotes and track their status through the sales process.
              </p>
              <Button className="w-full">Manage Quotes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supplier Network</CardTitle>
              <CardDescription>
                Manage supplier relationships and products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access your supplier network and product catalog for seamless sourcing.
              </p>
              <Button className="w-full">View Suppliers</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
