import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  Users, 
  TrendingUp,
  Eye,
  BarChart3
} from 'lucide-react';

interface SupplierStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalQuotes: number;
}

const SupplierPortalMain = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<SupplierStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    totalQuotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSupplierData();
    }
  }, [user]);

  const fetchSupplierData = async () => {
    try {
      setLoading(true);

      // Get supplier products count  
      const { count: totalProducts } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true });

      const { count: activeProducts } = await supabase
        .from('supplier_products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get quotes count
      const { count: totalQuotes } = await supabase
        .from('quote_items')
        .select('quote_id', { count: 'exact', head: true });

      // Get orders count
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        totalOrders: totalOrders || 0,
        totalQuotes: totalQuotes || 0
      });

    } catch (error) {
      console.error('Error fetching supplier data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Manage Products',
      description: 'Add, edit, or deactivate your product catalog',
      icon: Package,
      href: '/supplier/products',
      gradient: 'from-blue-500/20 to-cyan-500/20'
    },
    {
      title: 'View Orders',
      description: 'Track and fulfill customer orders',
      icon: ShoppingCart,
      href: '/supplier/orders',
      gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
      title: 'Quote Requests',
      description: 'Respond to customer quote requests',
      icon: FileText,
      href: '/supplier/quotes',
      gradient: 'from-purple-500/20 to-pink-500/20'
    },
    {
      title: 'Customer Analytics',
      description: 'View customer engagement and sales data',
      icon: BarChart3,
      href: '/supplier/analytics',
      gradient: 'from-orange-500/20 to-red-500/20'
    },
    {
      title: 'Customer Management',
      description: 'Manage customer relationships',
      icon: Users,
      href: '/supplier/customers',
      gradient: 'from-indigo-500/20 to-purple-500/20'
    },
    {
      title: 'Company Profile',
      description: 'Update supplier information and settings',
      icon: TrendingUp,
      href: '/supplier/profile',
      gradient: 'from-teal-500/20 to-green-500/20'
    }
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Welcome to Supplier Portal
        </h1>
        <p className="text-muted-foreground">
          Manage your products, track orders, and grow your business
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{stats.activeProducts}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500/10 to-pink-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{stats.totalQuotes}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-orange-500/10 to-red-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Card className={`border-0 shadow-md bg-gradient-to-br ${action.gradient} transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer h-full`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-background rounded-lg">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SupplierPortalMain;