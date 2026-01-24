import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ImageIcon, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface OrderIssue {
  id: string;
  order_id: string;
  customer_id: string;
  issue_type: string;
  description: string;
  photos: string[];
  status: string;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  source?: string | null;
  affected_items?: any;
  orders?: {
    order_number: string;
    status: string;
    customers?: {
      company_name: string;
      contact_name: string;
      email: string;
    };
  };
}

interface MobileIssueCardProps {
  issue: OrderIssue;
  onViewDetails: (issue: OrderIssue) => void;
}

const issueTypeLabels: Record<string, string> = {
  'missing_items': 'Missing Items',
  'damaged_items': 'Damaged Items',
  'wrong_items': 'Wrong Items',
  'late_delivery': 'Late Delivery',
  'quality_issue': 'Quality Issue',
  'other': 'Other'
};

export const MobileIssueCard: React.FC<MobileIssueCardProps> = ({ issue, onViewDetails }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 text-xs"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'reviewing':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Reviewing</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Resolved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getIssueTypeBadge = (type: string) => {
    const colorMap: Record<string, string> = {
      'missing_items': 'bg-orange-100 text-orange-800',
      'damaged_items': 'bg-red-100 text-red-800',
      'wrong_items': 'bg-purple-100 text-purple-800',
      'late_delivery': 'bg-blue-100 text-blue-800',
      'quality_issue': 'bg-yellow-100 text-yellow-800',
      'other': 'bg-slate-100 text-slate-800'
    };
    return (
      <Badge className={`${colorMap[type] || 'bg-slate-100 text-slate-800'} text-xs`}>
        {issueTypeLabels[type] || type}
      </Badge>
    );
  };

  const getSourceBadge = (source?: string | null) => {
    switch (source) {
      case 'customer_portal':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Portal</Badge>;
      case 'internal':
        return <Badge className="bg-green-100 text-green-800 text-xs">Internal</Badge>;
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800 text-xs">Admin</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow active:scale-[0.99] touch-manipulation">
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-sm">#{issue.orders?.order_number}</span>
              {getSourceBadge(issue.source)}
            </div>
            <p className="text-sm font-medium text-foreground mt-1 truncate">
              {issue.orders?.customers?.company_name || 'Unknown Customer'}
            </p>
          </div>
          {getStatusBadge(issue.status)}
        </div>

        {/* Issue Type & Description */}
        <div className="mb-3">
          <div className="mb-2">
            {getIssueTypeBadge(issue.issue_type)}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {issue.description}
          </p>
        </div>

        {/* Footer Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{format(new Date(issue.created_at), 'MMM d, yyyy')}</span>
            {issue.photos?.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {issue.photos.length}
              </span>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewDetails(issue)}
            className="h-8 touch-manipulation"
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
