import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
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
            <Button className="w-full" asChild>
              <Link to="/crm">Open CRM</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
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
            <Button className="w-full" asChild>
              <Link to="/quote-requests">Manage Quotes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
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
            <Button className="w-full" asChild>
              <Link to="/partners">View Suppliers</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Product Catalog</CardTitle>
            <CardDescription>
              Browse and manage product offerings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View all available products and their specifications for export.
            </p>
            <Button className="w-full" asChild>
              <Link to="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Analytics & Reports</CardTitle>
            <CardDescription>
              Business insights and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Track business performance with detailed analytics and reporting tools.
            </p>
            <Button className="w-full" asChild>
              <Link to="/analytics">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Customer Management</CardTitle>
            <CardDescription>
              Manage your customer relationships
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage all customer information and communication history.
            </p>
            <Button className="w-full" asChild>
              <Link to="/customers">Manage Customers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
