import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Package,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';
import { format } from 'date-fns';

interface OrderIssue {
  id: string;
  order_id: string;
  issue_type: string;
  description: string;
  photos: string[];
  status: string;
  created_at: string;
  orders?: {
    order_number: string;
  };
}

const issueTypeLabels: Record<string, string> = {
  'missing_items': 'Missing Items',
  'damaged_items': 'Damaged Items',
  'wrong_items': 'Wrong Items',
  'late_delivery': 'Late Delivery',
  'quality_issue': 'Quality Issue',
  'other': 'Other'
};

const statusLabels: Record<string, string> = {
  'submitted': 'Submitted',
  'reviewing': 'Under Review',
  'resolved': 'Resolved',
  'rejected': 'Rejected'
};

export default function CustomerIssues() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useCustomerAuth();
  
  const [issues, setIssues] = useState<OrderIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = useCallback(async () => {
    if (!profile?.email) return;

    try {
      // Get customer ID
      const { data: customerData } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .single();

      if (!customerData) {
        setIssues([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('order_issues')
        .select(`
          *,
          orders(order_number)
        `)
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (err) {
      console.error('Error fetching issues:', err);
      toast({
        title: "Error",
        description: "Failed to load your issues",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.email, toast]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'reviewing':
        return <Badge className="bg-yellow-100 text-yellow-800"><MessageSquare className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{statusLabels[status]}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getIssueTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'missing_items': 'bg-red-100 text-red-800',
      'damaged_items': 'bg-orange-100 text-orange-800',
      'wrong_items': 'bg-purple-100 text-purple-800',
      'late_delivery': 'bg-yellow-100 text-yellow-800',
      'quality_issue': 'bg-pink-100 text-pink-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-800'}>{issueTypeLabels[type] || type}</Badge>;
  };

  const pendingCount = issues.filter(i => i.status === 'submitted' || i.status === 'reviewing').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <PortalPageHeader
        title="My Issues"
        subtitle="Track your reported order issues and their status"
        totalCount={issues.length}
        totalIcon={AlertTriangle}
        stats={[
          { label: 'Total Issues', count: issues.length, icon: AlertTriangle },
          { label: 'Pending', count: pendingCount, icon: Clock },
          { label: 'Resolved', count: resolvedCount, icon: CheckCircle2 }
        ]}
        variant="customer"
      />

      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Issues Reported</h3>
            <p className="text-muted-foreground mb-4">
              You haven't reported any order issues. If you have a problem with an order, you can report it from your orders page.
            </p>
            <Button onClick={() => navigate('/portal/orders')}>
              <Package className="h-4 w-4 mr-2" />
              View My Orders
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card 
              key={issue.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/portal/order-issues/${issue.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">Order #{issue.orders?.order_number}</span>
                      {getStatusBadge(issue.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {getIssueTypeBadge(issue.issue_type)}
                      {issue.photos && issue.photos.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          {issue.photos.length} photo{issue.photos.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {issue.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reported {format(new Date(issue.created_at), 'PPp')}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}