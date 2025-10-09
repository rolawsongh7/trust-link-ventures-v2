import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, TrendingDown, Minus, Target, Zap, 
  Calendar, DollarSign, Mail, Phone, FileText 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Lead {
  id: string;
  title: string;
  customer_id?: string;
  status: string;
  value?: number;
  currency?: string;
  lead_score?: number;
  source?: string;
  created_at: string;
  expected_close_date?: string;
  customers?: {
    company_name: string;
    contact_name?: string;
  };
}

interface ScoreFactors {
  engagement: number;
  firmographics: number;
  behavior: number;
  timeDecay: number;
}

export const LeadScoringDashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeads();

    // Real-time subscription
    const subscription = supabase
      .channel('leads-scoring')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        () => fetchLeads()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers (company_name, contact_name)
        `)
        .order('lead_score', { ascending: false });

      if (error) throw error;

      // Calculate enhanced scores
      const enrichedLeads = data?.map(lead => ({
        ...lead,
        lead_score: calculateEnhancedScore(lead)
      })) || [];

      setLeads(enrichedLeads);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEnhancedScore = (lead: Lead): number => {
    let score = lead.lead_score || 50;

    // Engagement factor (recent activity)
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceCreated < 7) score += 10;
    else if (daysSinceCreated > 90) score -= 15;

    // Value factor
    if (lead.value) {
      if (lead.value > 100000) score += 15;
      else if (lead.value > 50000) score += 10;
      else if (lead.value > 10000) score += 5;
    }

    // Status factor
    switch (lead.status) {
      case 'qualified':
        score += 20;
        break;
      case 'proposal':
      case 'negotiation':
        score += 15;
        break;
      case 'contacted':
        score += 10;
        break;
      case 'closed_lost':
        score = 0;
        break;
    }

    // Source factor
    if (lead.source === 'referral') score += 10;
    else if (lead.source === 'website') score += 5;

    // Close date urgency
    if (lead.expected_close_date) {
      const daysToClose = Math.floor(
        (new Date(lead.expected_close_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysToClose > 0 && daysToClose < 30) score += 10;
    }

    return Math.min(Math.max(score, 0), 100);
  };

  const getScoreTier = (score: number): { label: string; color: string; icon: React.ReactNode } => {
    if (score >= 80) return { 
      label: 'Hot', 
      color: 'destructive',
      icon: <TrendingUp className="h-4 w-4" />
    };
    if (score >= 60) return { 
      label: 'Warm', 
      color: 'default',
      icon: <Target className="h-4 w-4" />
    };
    if (score >= 40) return { 
      label: 'Cool', 
      color: 'secondary',
      icon: <Minus className="h-4 w-4" />
    };
    return { 
      label: 'Cold', 
      color: 'outline',
      icon: <TrendingDown className="h-4 w-4" />
    };
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getProgressColor = (score: number): string => {
    if (score >= 80) return 'bg-red-600';
    if (score >= 60) return 'bg-orange-600';
    if (score >= 40) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  // Categorize leads
  const hotLeads = leads.filter(l => l.lead_score && l.lead_score >= 80);
  const warmLeads = leads.filter(l => l.lead_score && l.lead_score >= 60 && l.lead_score < 80);
  const coolLeads = leads.filter(l => l.lead_score && l.lead_score >= 40 && l.lead_score < 60);
  const coldLeads = leads.filter(l => l.lead_score && l.lead_score < 40);

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Score Distribution */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{hotLeads.length}</div>
            <p className="text-xs text-muted-foreground">Score 80-100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{warmLeads.length}</div>
            <p className="text-xs text-muted-foreground">Score 60-79</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cool Leads</CardTitle>
            <Minus className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{coolLeads.length}</div>
            <p className="text-xs text-muted-foreground">Score 40-59</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cold Leads</CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{coldLeads.length}</div>
            <p className="text-xs text-muted-foreground">Score 0-39</p>
          </CardContent>
        </Card>
      </div>

      {/* Prioritized Leads List */}
      <Card>
        <CardHeader>
          <CardTitle>Prioritized Leads</CardTitle>
          <CardDescription>Leads sorted by score - focus on the highest priority first</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads available</p>
            ) : (
              leads.slice(0, 10).map((lead) => {
                const score = lead.lead_score || 0;
                const tier = getScoreTier(score);
                
                return (
                  <div key={lead.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getScoreColor(score)} bg-opacity-10`}>
                        <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="font-semibold truncate">{lead.title}</h4>
                          <Badge variant={tier.color as any} className="flex-shrink-0">
                            <span className="flex items-center gap-1">
                              {tier.icon}
                              {tier.label}
                            </span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                          {lead.value && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {lead.currency} {lead.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="truncate">{lead.customers?.company_name || 'Unknown Company'}</span>
                        <Badge variant="outline">{lead.status}</Badge>
                        {lead.source && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {lead.source}
                          </span>
                        )}
                        {lead.expected_close_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(lead.expected_close_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Lead Score</span>
                          <span className="font-medium">{score}/100</span>
                        </div>
                        <Progress 
                          value={score} 
                          className="h-2"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
