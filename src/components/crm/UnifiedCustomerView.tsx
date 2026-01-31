import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, Mail, Phone, Building, MapPin, Calendar, 
  DollarSign, TrendingUp, FileText, MessageSquare, 
  Activity, Target, ShoppingCart, Eye, CreditCard, Gift
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AdminBreadcrumb } from '@/components/shared/AdminBreadcrumb';
import { LoyaltyBadge } from '@/components/loyalty/LoyaltyBadge';
import { CommercialSignalBadges } from '@/components/commercial/CommercialSignalBadges';
import { useCustomerLoyalty, useCustomerRecentOrders } from '@/hooks/useCustomerLoyalty';
import { getCommercialSignals } from '@/utils/commercialSignals';
import { CreditTermsPanel } from '@/components/credit/CreditTermsPanel';
import { CustomerBenefitsPanel } from '@/components/benefits/CustomerBenefitsPanel';
import { useRoleAuth } from '@/hooks/useRoleAuth';

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  industry: string;
  customer_status: string;
  priority: string;
  created_at: string;
}

interface Activity {
  id: string;
  activity_type: string;
  subject: string;
  description?: string;
  activity_date: string;
  status: string;
}

interface Lead {
  id: string;
  title: string;
  status: string;
  value: number;
  currency: string;
  lead_score: number;
  created_at: string;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface CustomerMetrics {
  totalLeads: number;
  activeLeads: number;
  totalQuotes: number;
  acceptedQuotes: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  lastActivity: string | null;
}

interface UnifiedCustomerViewProps {
  customerId: string;
  onBack: () => void;
}

export const UnifiedCustomerView: React.FC<UnifiedCustomerViewProps> = ({ customerId, onBack }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { hasAdminAccess } = useRoleAuth();
  
  // Loyalty and commercial signals
  const { data: loyaltyData } = useCustomerLoyalty(customerId);
  const { data: recentOrders } = useCustomerRecentOrders(customerId);
  const commercialSignals = getCommercialSignals(loyaltyData || null, recentOrders || []);

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('customer_id', customerId)
        .order('activity_date', { ascending: false })
        .limit(10);

      setActivities(activitiesData || []);

      // Fetch leads
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      setLeads(leadsData || []);

      // Fetch quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      setQuotes(quotesData || []);

      // Fetch orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      setOrders(ordersData || []);

      // Calculate metrics
      const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
      const avgOrderValue = ordersData?.length ? totalRevenue / ordersData.length : 0;
      const lastActivity = activitiesData?.[0]?.activity_date || null;

      setMetrics({
        totalLeads: leadsData?.length || 0,
        activeLeads: leadsData?.filter(l => !['closed_won', 'closed_lost'].includes(l.status)).length || 0,
        totalQuotes: quotesData?.length || 0,
        acceptedQuotes: quotesData?.filter(q => q.status === 'accepted').length || 0,
        totalOrders: ordersData?.length || 0,
        totalRevenue,
        avgOrderValue,
        lastActivity,
      });
    } catch (error: any) {
      console.error('Error fetching customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return <div>Customer not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AdminBreadcrumb 
        items={[
          { label: 'Customers', href: '/admin/customers' },
          { label: customer.company_name }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{customer.company_name}</h1>
              {loyaltyData && (
                <LoyaltyBadge tier={loyaltyData.loyalty_tier} />
              )}
            </div>
            <p className="text-muted-foreground">{customer.contact_name}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Badge variant={getStatusColor(customer.customer_status)}>
              {customer.customer_status}
            </Badge>
            <Badge variant={getPriorityColor(customer.priority)}>
              {customer.priority} priority
            </Badge>
          </div>
          <CommercialSignalBadges 
            signals={commercialSignals} 
            variant="compact"
            showCreditCandidate={true}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics?.totalRevenue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: ${metrics?.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeLeads || 0}</div>
            <p className="text-xs text-muted-foreground">
              of {metrics?.totalLeads || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.acceptedQuotes || 0} accepted quotes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.lastActivity ? format(new Date(metrics.lastActivity), 'MMM d') : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent interaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{customer.industry}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{customer.country}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className={`grid w-full ${hasAdminAccess ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
          {hasAdminAccess && (
            <>
              <TabsTrigger value="credit" className="gap-1">
                <CreditCard className="h-3 w-3" />
                Credit
              </TabsTrigger>
              <TabsTrigger value="benefits" className="gap-1">
                <Gift className="h-3 w-3" />
                Benefits
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activities recorded</p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex gap-4 border-l-2 border-primary pl-4 pb-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{activity.activity_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(activity.activity_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <p className="font-medium">{activity.subject}</p>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads</CardTitle>
              <CardDescription>Sales opportunities in pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No leads for this customer</p>
                ) : (
                  leads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{lead.title}</p>
                        <div className="flex gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{lead.status}</Badge>
                          <span>Score: {lead.lead_score}/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{lead.currency} {lead.value?.toLocaleString() || 0}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>Pricing proposals sent to customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No quotes for this customer</p>
                ) : (
                  quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{quote.quote_number}</p>
                        <p className="text-sm text-muted-foreground">{quote.title}</p>
                        <Badge variant="outline">{quote.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">{quote.currency} {quote.total_amount?.toLocaleString() || 0}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(quote.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px]"
                          onClick={() => navigate('/admin/quotes', { state: { viewQuoteId: quote.id } })}
                          aria-label={`View quote ${quote.quote_number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Purchase history and fulfillment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No orders for this customer</p>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">${order.total_amount?.toLocaleString() || 0}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px]"
                          onClick={() => navigate('/admin/orders', { state: { highlightOrderId: order.id } })}
                          aria-label={`View order ${order.order_number}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Tab - Admin only */}
        {hasAdminAccess && (
          <TabsContent value="credit" className="space-y-4">
            <CreditTermsPanel 
              customerId={customerId} 
              customerName={customer.company_name} 
            />
          </TabsContent>
        )}

        {/* Benefits Tab - Admin only */}
        {hasAdminAccess && (
          <TabsContent value="benefits" className="space-y-4">
            <CustomerBenefitsPanel 
              customerId={customerId} 
              customerName={customer.company_name} 
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
