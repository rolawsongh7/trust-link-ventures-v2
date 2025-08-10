import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, Calendar, Target, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalCustomers: number;
  totalLeads: number;
  totalOpportunities: number;
  totalValue: number;
  recentActivities: any[];
  pipelineStages: any[];
}

const CRMDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalLeads: 0,
    totalOpportunities: 0,
    totalValue: 0,
    recentActivities: [],
    pipelineStages: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();

    // Set up real-time subscriptions for dashboard updates
    const channelCustomers = supabase
      .channel('dashboard-customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, fetchDashboardData)
      .subscribe();

    const channelLeads = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchDashboardData)
      .subscribe();

    const channelOpportunities = supabase
      .channel('dashboard-opportunities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, fetchDashboardData)
      .subscribe();

    const channelActivities = supabase
      .channel('dashboard-activities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, fetchDashboardData)
      .subscribe();

    return () => {
      supabase.removeChannel(channelCustomers);
      supabase.removeChannel(channelLeads);
      supabase.removeChannel(channelOpportunities);
      supabase.removeChannel(channelActivities);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Fetch opportunities count and total value
      const { data: opportunities } = await supabase
        .from('opportunities')
        .select('value');

      const totalValue = opportunities?.reduce((sum, opp) => sum + (Number(opp.value) || 0), 0) || 0;

      // Fetch recent activities
      const { data: activities } = await supabase
        .from('activities')
        .select(`
          *,
          customers(company_name),
          leads(contact_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch pipeline stages with counts
      const { data: pipelineData } = await supabase
        .from('opportunities')
        .select('stage');

      const stageCounts = pipelineData?.reduce((acc, opp) => {
        acc[opp.stage] = (acc[opp.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setStats({
        totalCustomers: customersCount || 0,
        totalLeads: leadsCount || 0,
        totalOpportunities: opportunities?.length || 0,
        totalValue,
        recentActivities: activities || [],
        pipelineStages: Object.entries(stageCounts).map(([stage, count]) => ({
          stage,
          count
        }))
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Active customer accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">Leads in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">Open opportunities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total opportunity value</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities and Pipeline Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest customer interactions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activities</p>
              ) : (
                stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-primary mt-2"></div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.customers?.company_name || activity.leads?.contact_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.activity_type}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pipeline Overview
            </CardTitle>
            <CardDescription>Opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pipelineStages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities in pipeline</p>
              ) : (
                stats.pipelineStages.map((stage) => (
                  <div key={stage.stage} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                      <span className="text-sm font-medium capitalize">
                        {stage.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge variant="secondary">{stage.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CRMDashboard;