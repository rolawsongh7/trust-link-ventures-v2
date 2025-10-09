import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, Send, CheckCircle, XCircle, TrendingUp, 
  Clock, AlertCircle, DollarSign, Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PipelineStage {
  stage: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  value: number;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  sent_at?: string;
  valid_until?: string;
  customers?: {
    company_name: string;
  };
  orders?: {
    id: string;
    order_number: string;
    status: string;
  }[];
}

export const QuoteToOrderPipeline: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();

    // Real-time subscription
    const subscription = supabase
      .channel('quotes-pipeline')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        () => fetchQuotes()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customers (company_name),
          orders (id, order_number, status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate pipeline stages
  const stages: PipelineStage[] = [
    {
      stage: 'draft',
      label: 'Draft',
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-gray-500',
      count: quotes.filter(q => q.status === 'draft').length,
      value: quotes.filter(q => q.status === 'draft').reduce((sum, q) => sum + Number(q.total_amount || 0), 0)
    },
    {
      stage: 'sent',
      label: 'Sent',
      icon: <Send className="h-4 w-4" />,
      color: 'bg-blue-500',
      count: quotes.filter(q => q.status === 'sent').length,
      value: quotes.filter(q => q.status === 'sent').reduce((sum, q) => sum + Number(q.total_amount || 0), 0)
    },
    {
      stage: 'accepted',
      label: 'Accepted',
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'bg-green-500',
      count: quotes.filter(q => q.status === 'accepted').length,
      value: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + Number(q.total_amount || 0), 0)
    },
    {
      stage: 'converted',
      label: 'Converted to Order',
      icon: <Package className="h-4 w-4" />,
      color: 'bg-emerald-500',
      count: quotes.filter(q => q.orders && q.orders.length > 0).length,
      value: quotes.filter(q => q.orders && q.orders.length > 0).reduce((sum, q) => sum + Number(q.total_amount || 0), 0)
    },
    {
      stage: 'rejected',
      label: 'Rejected',
      icon: <XCircle className="h-4 w-4" />,
      color: 'bg-red-500',
      count: quotes.filter(q => q.status === 'rejected').length,
      value: quotes.filter(q => q.status === 'rejected').reduce((sum, q) => sum + Number(q.total_amount || 0), 0)
    }
  ];

  // Calculate metrics
  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, q) => sum + Number(q.total_amount || 0), 0);
  const conversionRate = totalQuotes > 0 
    ? Math.round((stages.find(s => s.stage === 'converted')?.count || 0) / totalQuotes * 100)
    : 0;
  const avgQuoteValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  // Bottleneck analysis
  const bottleneck = stages.reduce((max, stage) => 
    stage.count > max.count ? stage : max
  , stages[0]);

  // Filter quotes by selected stage
  const filteredQuotes = selectedStage === 'all' 
    ? quotes 
    : quotes.filter(q => {
        if (selectedStage === 'converted') {
          return q.orders && q.orders.length > 0;
        }
        return q.status === selectedStage;
      });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'accepted': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              ${totalValue.toLocaleString()} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Quotes converted to orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Quote Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgQuoteValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              Average per quote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottleneck</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{bottleneck.label}</div>
            <p className="text-xs text-muted-foreground">
              {bottleneck.count} quotes stuck
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Quote-to-Order Pipeline</CardTitle>
          <CardDescription>Track quotes through each stage of the sales process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stage Bars */}
            <div className="flex gap-2 items-end h-64">
              {stages.map((stage) => {
                const maxCount = Math.max(...stages.map(s => s.count));
                const height = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                
                return (
                  <div 
                    key={stage.stage}
                    className="flex-1 flex flex-col items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedStage(stage.stage)}
                  >
                    <div 
                      className={`w-full rounded-t-lg ${stage.color} relative flex flex-col items-center justify-end p-2 transition-all`}
                      style={{ height: `${height}%`, minHeight: '60px' }}
                    >
                      <div className="text-white font-bold text-lg mb-1">
                        {stage.count}
                      </div>
                      <div className="text-white text-xs opacity-90">
                        ${stage.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        {stage.icon}
                      </div>
                      <div className="text-xs font-medium">{stage.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage Details */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant={selectedStage === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStage('all')}
                >
                  All Stages
                </Button>
                {stages.map(stage => (
                  <Button
                    key={stage.stage}
                    variant={selectedStage === stage.stage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStage(stage.stage)}
                  >
                    {stage.label} ({stage.count})
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedStage === 'all' ? 'All Quotes' : `${stages.find(s => s.stage === selectedStage)?.label} Quotes`}
          </CardTitle>
          <CardDescription>
            {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''} in this stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes in this stage</p>
            ) : (
              filteredQuotes.map((quote) => (
                <div key={quote.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{quote.quote_number}</span>
                      <Badge variant={getStatusColor(quote.status)}>
                        {quote.status}
                      </Badge>
                      {quote.orders && quote.orders.length > 0 && (
                        <Badge variant="default" className="bg-emerald-500">
                          <Package className="h-3 w-3 mr-1" />
                          Converted
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{quote.title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{quote.customers?.company_name || 'Unknown'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(quote.created_at), 'MMM d, yyyy')}
                      </span>
                      {quote.sent_at && (
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          Sent {format(new Date(quote.sent_at), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {quote.currency} {quote.total_amount.toLocaleString()}
                    </p>
                    {quote.orders && quote.orders.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Order: {quote.orders[0].order_number}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
