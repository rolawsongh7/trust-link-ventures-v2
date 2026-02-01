import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Building2, Mail, Phone, MapPin, Eye, Edit } from 'lucide-react';
import type { Customer } from '@/hooks/useCustomersQuery';
import { LoyaltyBadge } from '@/components/loyalty/LoyaltyBadge';
import { TrustBadge } from '@/components/trust/TrustBadge';
import { useCustomerLoyalty } from '@/hooks/useCustomerLoyalty';
import { useCustomerTrust } from '@/hooks/useCustomerTrust';
import type { TrustTier } from '@/utils/trustHelpers';

interface CustomerCardProps {
  customer: Customer;
  onView?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
}

const getStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    active: 'bg-green-500/10 text-green-600 border-green-500/20',
    prospect: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    inactive: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
  return colors[status || 'active'] || 'bg-muted';
};

const getCustomerBorderColor = (status?: string) => {
  const borders: Record<string, string> = {
    active: 'border-l-green-500',
    prospect: 'border-l-blue-500',
    inactive: 'border-l-slate-500',
  };
  return borders[status || 'active'] || 'border-l-gray-300';
};

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onView,
  onEdit,
}) => {
  const { data: loyaltyData } = useCustomerLoyalty(customer.id);
  const { data: trustData } = useCustomerTrust(customer.id);
  
  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${getCustomerBorderColor(customer.customer_status)}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{customer.company_name}</span>
            </div>
            {customer.contact_name && (
              <p className="text-sm text-muted-foreground">{customer.contact_name}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(customer)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}

          {customer.country && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span>{customer.country}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={getStatusColor(customer.customer_status)}>
                {customer.customer_status || 'active'}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {trustData && (
                <TrustBadge 
                  tier={(trustData.trust_tier || 'new') as TrustTier} 
                  variant="compact" 
                  hasOverride={trustData.manual_override}
                />
              )}
              {loyaltyData && (
                <LoyaltyBadge tier={loyaltyData.loyalty_tier} variant="compact" />
              )}
            </div>
          </div>

          {customer.industry && (
            <div className="text-xs text-muted-foreground">
              {customer.industry}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
