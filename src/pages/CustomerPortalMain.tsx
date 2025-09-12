import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  MessageSquare, 
  User, 
  Grid3X3,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalQuotes: number;
  pendingQuotes: number;
  totalOrders: number;
  recentActivity: any[];
}

const CustomerPortalMain = () => {
  const { profile, signOut } = useCustomerAuth();
  const { totalItems } = useShoppingCart();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotes: 0,
    pendingQuotes: 0,
    totalOrders: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.email) return;
    
    try {
      // Fetch quote requests
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('lead_email', profile.email)
        .order('created_at', { ascending: false });

      const totalQuotes = quotes?.length || 0;
      const pendingQuotes = quotes?.filter(q => q.status === 'pending').length || 0;

      // Fetch recent activity (last 5 quotes)
      const recentActivity = quotes?.slice(0, 5) || [];

      setStats({
        totalQuotes,
        pendingQuotes,
        totalOrders: 0, // Placeholder for orders
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Browse Products',
      description: 'Explore our premium seafood catalog',
      icon: Grid3X3,
      href: '/customer/catalog',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'My Cart',
      description: 'Review items and request quotes',
      icon: ShoppingCart,
      href: '/customer/cart',
      color: 'from-green-500 to-green-600',
      badge: totalItems > 0 ? totalItems : undefined
    },
    {
      title: 'My Quotes',
      description: 'View requested and generated quotes',
      icon: FileText,
      href: '/customer/quotes',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'My Orders',
      description: 'Track shipments and order history',
      icon: Package,
      href: '/customer/orders',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Communications',
      description: 'Send messages to our team',
      icon: MessageSquare,
      href: '/customer/communications',
      color: 'from-teal-500 to-teal-600'
    },
    {
      title: 'Profile',
      description: 'Manage your account settings',
      icon: User,
      href: '/customer/profile',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome to Trust Link Ventures</h1>
        <p className="text-muted-foreground">Your premium seafood and meat products partner</p>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.href}>
              <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 group cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    {action.badge && (
                      <Badge variant="secondary">{action.badge}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {action.description}
                  </p>
                  <div className="flex items-center text-primary text-sm font-medium">
                    <ArrowRight className="h-4 w-4 ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Overview */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Quick Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Quotes</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.pendingQuotes}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cart Items</p>
                  <p className="text-3xl font-bold text-purple-600">{totalItems}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <FileText className="h-5 w-5 text-primary mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">Quote requested: {activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()} • 
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge 
                      variant={activity.status === 'pending' ? 'secondary' : 'default'}
                      className="capitalize"
                    >
                      {activity.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerPortalMain;