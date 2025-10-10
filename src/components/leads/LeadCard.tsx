import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, TrendingUp, Eye, Edit, Star } from 'lucide-react';
import type { Lead } from '@/hooks/useLeadsQuery';

interface LeadCardProps {
  lead: Lead & { customers?: { company_name: string } };
  onView?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    contacted: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    qualified: 'bg-green-500/10 text-green-600 border-green-500/20',
    proposal: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    negotiation: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    closed_won: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    closed_lost: 'bg-red-500/10 text-red-600 border-red-500/20',
  };
  return colors[status] || 'bg-muted';
};

const getScoreColor = (score?: number) => {
  if (!score) return 'text-muted-foreground';
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
};

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  onView,
  onEdit,
  onConvert,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold line-clamp-1">{lead.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {lead.customers?.company_name || 'No customer'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(lead)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(lead)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onConvert && lead.status === 'qualified' && (
                <DropdownMenuItem onClick={() => onConvert(lead)}>
                  <Star className="h-4 w-4 mr-2" />
                  Convert to Opportunity
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          {lead.value !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Value</span>
              <span className="font-semibold">
                {lead.currency || 'USD'} {lead.value.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status.replace('_', ' ')}
            </Badge>
          </div>

          {lead.lead_score !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Score</span>
              <div className="flex items-center gap-1">
                <Star className={`h-3 w-3 ${getScoreColor(lead.lead_score)}`} fill="currentColor" />
                <span className={`font-semibold ${getScoreColor(lead.lead_score)}`}>
                  {lead.lead_score}/100
                </span>
              </div>
            </div>
          )}

          {lead.description && (
            <div className="pt-2 border-t">
              <p className="text-sm line-clamp-2 text-muted-foreground">{lead.description}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
