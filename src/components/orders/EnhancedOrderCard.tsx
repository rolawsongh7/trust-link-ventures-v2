import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  FileText,
  DollarSign,
  MapPin,
  Calendar,
  User,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { cardHoverSubtle, buttonHover } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface EnhancedOrderCardProps {
  order: any;
  onView?: (order: any) => void;
  onEdit?: (order: any) => void;
  onDelete?: (order: any) => void;
  onGenerateInvoice?: (order: any) => void;
}

export function EnhancedOrderCard({
  order,
  onView,
  onEdit,
  onDelete,
  onGenerateInvoice
}: EnhancedOrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'GHS': '₵'
    };
    return symbols[currency] || currency;
  };

  const getCurrencyFlag = (currency: string) => {
    const flags: Record<string, string> = {
      'USD': '🇺🇸',
      'EUR': '🇪🇺',
      'GBP': '🇬🇧',
      'GHS': '🇬🇭'
    };
    return flags[currency] || '💰';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <motion.div
      variants={cardHoverSubtle}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      layout
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        "border-l-4 shadow-sm hover:shadow-lg",
        "gradient-border group",
        // Status-based left border color
        order.status === 'delivered' && "border-l-green-500",
        order.status === 'shipped' && "border-l-blue-500",
        order.status === 'processing' && "border-l-purple-500",
        order.status === 'pending_payment' && "border-l-yellow-500",
        order.status === 'cancelled' && "border-l-red-500",
      )}>
        {/* Background gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-accent/0 opacity-0 group-hover:opacity-5 transition-opacity duration-300" />

        <CardContent className="p-4 md:p-6 relative">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-4 md:mb-6">
            <div className="flex-1 min-w-0">
              {/* Order Number with gradient text */}
              <motion.h3 
                className="text-lg md:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-1"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                {order.order_number}
              </motion.h3>
              
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(order.created_at), 'MMM dd, yyyy')}</span>
              </div>
            </div>

            {/* Status Badge & Actions */}
            <div className="flex items-center gap-2 ml-4">
              <StatusBadge 
                status={order.status} 
                size={isMobile ? 'sm' : 'md'}
                animated
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 hover:bg-muted/50 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-modal">
                  <DropdownMenuItem onClick={() => onView?.(order)} className="gap-2">
                    <Eye className="h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(order)} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onGenerateInvoice?.(order)} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Generate Invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(order)} 
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Info Grid */}
          <div className={cn(
            "grid gap-4 transition-all duration-300",
            isExpanded || !isMobile ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"
          )}>
            {/* Customer Info */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">Customer</p>
                <p className="text-sm font-semibold truncate">
                  {order.customers?.company_name || 'N/A'}
                </p>
                {order.customers?.contact_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    {order.customers.contact_name}
                  </p>
                )}
              </div>
            </div>

            {/* Amount with currency flag */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">Total Amount</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs">{getCurrencyFlag(order.currency)}</span>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {getCurrencySymbol(order.currency)} {formatCurrency(order.total_amount, order.currency)}
                  </p>
                </div>
                <Badge variant="outline" className="mt-1 text-xs px-1.5 py-0">
                  {order.currency}
                </Badge>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-1">Delivery</p>
                <p className="text-sm font-semibold truncate">
                  {order.customer_addresses?.city || 'Not specified'}
                </p>
                {order.customer_addresses?.region && (
                  <p className="text-xs text-muted-foreground truncate">
                    {order.customer_addresses.region}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Expandable section for mobile */}
          {isMobile && !isExpanded && (
            <motion.button
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 rounded-lg hover:bg-muted/30"
              onClick={() => setIsExpanded(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Show more</span>
              <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}

          {/* Quote Origin Badge (if from quote) */}
          {order.source_type === 'quote' && order.quote_number && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  From Quote:
                </span>
                <Badge variant="outline" className="text-xs font-mono">
                  {order.quote_number}
                </Badge>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border/50">
            <motion.div variants={buttonHover} whileHover="hover" whileTap="tap" className="flex-1">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => onView?.(order)}
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">View</span>
              </Button>
            </motion.div>
            
            <motion.div variants={buttonHover} whileHover="hover" whileTap="tap" className="flex-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onEdit?.(order)}
                className="w-full gap-2 hover:bg-muted/50"
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
                <span className="sm:hidden">Edit</span>
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
