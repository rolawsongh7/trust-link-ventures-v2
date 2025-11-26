import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  MessageSquare, 
  User, 
  Grid3X3,
  Clock,
  ArrowRight,
  Building2,
  DollarSign
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { supabase } from '@/integrations/supabase/client';
import { PullToRefresh } from '@/components/customer/PullToRefresh';
import { AddressBanner } from '@/components/customer/AddressBanner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CustomerAddresses } from '@/components/customer/CustomerAddresses';
import { DashboardCard } from '@/components/customer/DashboardCard';
import { RecentActivityList } from '@/components/customer/RecentActivityList';
import { TabletPillNav } from '@/components/customer/navigation/TabletPillNav';
import { DesktopSidebar } from '@/components/customer/navigation/DesktopSidebar';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;
    
    try {
      // Get customer_id from customer_users mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;

      // Fetch quote requests using customer_id
      const { data: quotes } = await supabase
        .from('quote_requests')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      const totalQuotes = quotes?.length || 0;
      const pendingQuotes = quotes?.filter(q => q.status === 'pending').length || 0;

      // Fetch actual orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, status')
        .eq('customer_id', customerId)
        .not('status', 'eq', 'cancelled');

      const totalOrders = orders?.length || 0;

      // Fetch recent activity (last 5 quotes)
      const recentActivity = quotes?.slice(0, 5) || [];

      setStats({
        totalQuotes,
        pendingQuotes,
        totalOrders,
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
      href: '/portal/catalog',
      color: 'from-[#0077B6] to-[#003366]',
      borderColor: 'border-l-primary'
    },
    {
      title: 'My Cart',
      description: 'Review items and request quotes',
      icon: ShoppingCart,
      href: '/portal/cart',
      color: 'from-[#00B4D8] to-[#0077B6]',
      badge: totalItems > 0 ? totalItems : undefined,
      borderColor: 'border-l-orange-500'
    },
    {
      title: 'My Quotes',
      description: 'View requested and generated quotes',
      icon: FileText,
      href: '/portal/quotes',
      color: 'from-[#0096C7] to-[#0077B6]',
      borderColor: 'border-l-blue-500'
    },
    {
      title: 'My Orders',
      description: 'Track shipments and order history',
      icon: Package,
      href: '/portal/orders',
      color: 'from-[#023E8A] to-[#0077B6]',
      borderColor: 'border-l-green-500'
    },
    {
      title: 'Communications',
      description: 'Send messages to our team',
      icon: MessageSquare,
      href: '/portal/communications',
      color: 'from-[#0077B6] to-[#03045E]',
      borderColor: 'border-l-purple-500'
    },
    {
      title: 'Profile',
      description: 'Manage your account settings',
      icon: User,
      href: '/portal/profile',
      color: 'from-[#0096C7] to-[#023E8A]',
      borderColor: 'border-l-primary'
    },
    {
      title: 'Invoices',
      description: 'View and download invoices',
      icon: DollarSign,
      href: '/portal/invoices',
      color: 'from-[#00B4D8] to-[#0096C7]',
      borderColor: 'border-l-yellow-500'
    }
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Transform recent activity for RecentActivityList component
  const recentActivities = stats.recentActivity.map((activity) => ({
    id: activity.id,
    type: 'quote' as const,
    title: `Quote: ${activity.title}`,
    status: activity.status,
    timestamp: activity.created_at,
    link: `/portal/quotes/${activity.id}`
  }));

  if (loading) {
    return (
      <div className="flex w-full">
        <DesktopSidebar cartItemsCount={totalItems} />
        <div className="flex-1">
          <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-6xl 
                          mx-auto 
                          px-4 sm:px-5 md:px-6 lg:px-8 
                          py-5 sm:py-6 md:py-8">
            <div className="space-y-5 sm:space-y-6 md:space-y-8">
              {/* Header Skeleton */}
              <div className="flex items-center gap-3 animate-pulse">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="w-10 h-10 rounded-full" />
              </div>

              {/* Tablet Nav Skeleton */}
              <div className="hidden sm:flex lg:hidden gap-2 animate-pulse">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
              </div>

              {/* Cards Grid Skeleton */}
              <div>
                <Skeleton className="h-7 w-32 mb-4" />
                <div className="grid 
                                grid-cols-2 gap-3 
                                sm:grid-cols-3 gap-4 
                                lg:grid-cols-4 gap-5">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="rounded-2xl h-32 sm:h-36" />
                  ))}
                </div>
              </div>

              {/* Stats Skeleton */}
              <div>
                <Skeleton className="h-7 w-40 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="rounded-2xl h-24" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchDashboardData}>
      <div className="flex w-full">
        {/* Desktop Sidebar */}
        <DesktopSidebar cartItemsCount={totalItems} />
        
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-6xl 
                          mx-auto 
                          px-4 sm:px-5 md:px-6 lg:px-8 
                          py-5 sm:py-6 md:py-8
                          space-y-5 sm:space-y-6 md:space-y-8">
            
            {/* Sticky Header */}
            <div className="bg-tl-gradient text-white rounded-lg shadow-md p-4 sm:p-6 mb-5 sm:mb-6 md:mb-8">
              <div className="flex items-center justify-between">
                {/* Left: Brand Icon */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 
                                  bg-white/20 
                                  rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl 
                                   font-semibold text-white">
                      Dashboard
                    </h1>
                    <p className="text-xs sm:text-sm text-white/80">
                      Welcome back, {profile?.full_name || 'Customer'}
                    </p>
                  </div>
                </div>

                {/* Right: Profile Avatar + Status Dot */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      <AvatarFallback className="bg-white/20 text-white text-sm font-semibold">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online status dot */}
                    <div className="absolute bottom-0 right-0 
                                    w-3 h-3 
                                    bg-green-500 
                                    border-2 border-white
                                    rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Banner */}
            <AddressBanner onAddAddressClick={() => setShowAddressDialog(true)} />

            {/* Tablet Pill Navigation */}
            <TabletPillNav />

            {/* Quick Actions */}
            <div className="space-y-4 sm:space-y-5">
              <h2 className="text-lg sm:text-xl md:text-2xl 
                             font-semibold 
                             text-[#0f2f57] dark:text-white 
                             px-0">
                Quick Actions
              </h2>
              
              {/* Responsive Grid */}
              <div className="grid 
                              grid-cols-2 gap-3 
                              sm:grid-cols-3 md:grid-cols-3 gap-4 md:gap-5 
                              lg:grid-cols-4 xl:grid-cols-5 gap-5 xl:gap-6">
                {quickActions.map((action, index) => (
                  <DashboardCard
                    key={action.title}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    to={action.href}
                    color={action.color}
                    badge={action.badge}
                    delay={index * 25}
                    borderColor={action.borderColor}
                  />
                ))}
              </div>
            </div>

            {/* Quick Overview */}
            <div className="space-y-4 sm:space-y-5">
              <h2 className="text-lg sm:text-xl md:text-2xl 
                             font-semibold 
                             text-tl-primary
                             px-0">
                Quick Overview
              </h2>
              
              <div className="grid 
                              grid-cols-1 gap-3
                              sm:grid-cols-3 gap-4 md:gap-5">
                {/* Active Quotes Card */}
                <div className="bg-tl-surface border border-tl-border rounded-lg shadow-sm hover:shadow-md 
                                transition-all duration-200 
                                hover:translate-y-[-2px] 
                                active:translate-y-0
                                motion-reduce:transition-none
                                cursor-pointer p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm 
                                    text-tl-muted
                                    font-medium mb-1">
                        Active Quotes
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-4xl 
                                    font-bold 
                                    text-tl-primary">
                        {stats.pendingQuotes}
                      </p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 
                                    rounded-xl 
                                    bg-tl-accent/10
                                    flex items-center justify-center">
                      <FileText className="h-6 w-6 sm:h-7 sm:w-7 
                                           text-tl-accent" />
                    </div>
                  </div>
                </div>

                {/* Total Orders Card */}
                <div className="bg-tl-surface border border-tl-border rounded-lg shadow-sm hover:shadow-md 
                                transition-all duration-200 
                                hover:translate-y-[-2px] 
                                active:translate-y-0
                                motion-reduce:transition-none
                                cursor-pointer p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm 
                                    text-tl-muted
                                    font-medium mb-1">
                        Total Orders
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-4xl 
                                    font-bold 
                                    text-tl-primary">
                        {stats.totalOrders}
                      </p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 
                                    rounded-xl 
                                    bg-tl-gold/10
                                    flex items-center justify-center">
                      <Package className="h-6 w-6 sm:h-7 sm:w-7 
                                         text-tl-gold" />
                    </div>
                  </div>
                </div>

                {/* Cart Items Card */}
                <div className="bg-tl-surface border border-tl-border rounded-lg shadow-sm hover:shadow-md 
                                transition-all duration-200 
                                hover:translate-y-[-2px] 
                                active:translate-y-0
                                motion-reduce:transition-none
                                cursor-pointer p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm 
                                    text-tl-muted
                                    font-medium mb-1">
                        Cart Items
                      </p>
                      <p className="text-2xl sm:text-3xl md:text-4xl 
                                    font-bold 
                                    text-tl-primary">
                        {totalItems}
                      </p>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 
                                    rounded-xl 
                                    bg-tl-accent/10
                                    flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 
                                               text-tl-accent" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivities.length > 0 && (
              <div className="space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between px-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl 
                                 font-semibold 
                                 text-[#0f2f57] dark:text-white">
                    Recent Activity
                  </h2>
                  <Link 
                    to="/portal/quotes" 
                    className="text-sm font-medium 
                               text-[#0077B6] dark:text-[#2AA6FF] 
                               hover:underline
                               min-h-[44px] min-w-[44px]
                               flex items-center gap-1
                               focus-maritime">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <RecentActivityList 
                  activities={recentActivities}
                  loading={loading}
                  maxItems={6}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Management Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <CustomerAddresses />
        </DialogContent>
      </Dialog>
    </PullToRefresh>
  );
};

export default CustomerPortalMain;