import { useMemo, useState, useCallback } from 'react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useShoppingCart } from '@/hooks/useShoppingCart';

export type AlertPriority = 'high' | 'medium' | 'low';

export interface DashboardAlert {
  id: string;
  type: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaRoute: string;
  ctaAction?: () => void;
  priority: AlertPriority;
  icon?: string;
  orderId?: string;
  orderNumber?: string;
  quoteId?: string;
  daysRemaining?: number;
}

interface AlertsData {
  hasDefaultAddress: boolean;
  pendingPaymentOrders: Array<{ id: string; order_number: string }>;
  unpaidInvoices: Array<{ id: string; order_id: string; order?: { order_number: string } }>;
  expiringQuotes: Array<{ id: string; quote_number: string; valid_until: string }>;
  lastDeliveredOrder: { id: string; order_number: string; order_items: any[] } | null;
  profileIncomplete: boolean;
}

export function useDashboardAlerts() {
  const { profile, user } = useCustomerAuth();
  const { addItem } = useShoppingCart();
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    const saved = sessionStorage.getItem('dismissedAlerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const fetchAlertsData = useCallback(async () => {
    if (!profile?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get customer_id from customer_users mapping
      const { data: customerMapping } = await supabase
        .from('customer_users')
        .select('customer_id')
        .eq('user_id', profile.id)
        .single();

      const customerId = customerMapping?.customer_id || profile.id;

      // Parallel fetch all data
      const [
        addressesResult,
        ordersResult,
        invoicesResult,
        quotesResult,
        deliveredOrderResult
      ] = await Promise.all([
        // Check for default address
        supabase
          .from('customer_addresses')
          .select('id')
          .eq('customer_id', customerId)
          .eq('is_default', true)
          .limit(1),
        
        // Get orders needing payment
        supabase
          .from('orders')
          .select('id, order_number, status')
          .eq('customer_id', customerId)
          .in('status', ['order_confirmed', 'pending_payment']),
        
        // Get unpaid invoices
        supabase
          .from('invoices')
          .select('id, order_id, orders!invoices_order_id_fkey(order_number)')
          .eq('customer_id', customerId)
          .eq('status', 'unpaid'),
        
        // Get quotes expiring soon (within 2 days)
        supabase
          .from('quotes')
          .select('id, quote_number, valid_until, customer_id')
          .eq('status', 'sent')
          .eq('customer_id', customerId)
          .not('valid_until', 'is', null),
        
        // Get last delivered order for reorder
        supabase
          .from('orders')
          .select('id, order_number, order_items(*)')
          .eq('customer_id', customerId)
          .eq('status', 'delivered')
          .order('delivered_at', { ascending: false })
          .limit(1)
      ]);

      // Check for pending orders that need address (for high priority alert)
      const { data: pendingAddressOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
        .is('delivery_address_id', null)
        .in('status', ['payment_received', 'processing', 'order_confirmed'])
        .limit(1);

      // Filter expiring quotes (within 2 days)
      const now = new Date();
      const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      const expiringQuotes = (quotesResult.data || []).filter(quote => {
        if (!quote.valid_until) return false;
        const validUntil = new Date(quote.valid_until);
        return validUntil > now && validUntil <= twoDaysFromNow;
      });

      // Check profile completeness
      const profileIncomplete = !profile.company_name || !profile.full_name || !profile.phone;

      setAlertsData({
        hasDefaultAddress: (addressesResult.data?.length || 0) > 0 || (pendingAddressOrders?.length || 0) === 0,
        pendingPaymentOrders: ordersResult.data || [],
        unpaidInvoices: (invoicesResult.data || []).map(inv => ({
          id: inv.id,
          order_id: inv.order_id || '',
          order: inv.orders ? { order_number: (inv.orders as any).order_number } : undefined
        })),
        expiringQuotes: expiringQuotes.map(q => ({
          id: q.id,
          quote_number: q.quote_number || '',
          valid_until: q.valid_until || ''
        })),
        lastDeliveredOrder: deliveredOrderResult.data?.[0] || null,
        profileIncomplete
      });
    } catch (error) {
      console.error('Error fetching alerts data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, user?.id, profile?.company_name, profile?.full_name, profile?.phone]);

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.add(alertId);
      sessionStorage.setItem('dismissedAlerts', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const handleReorder = useCallback(async () => {
    if (!alertsData?.lastDeliveredOrder?.order_items) return;
    
    for (const item of alertsData.lastDeliveredOrder.order_items) {
      addItem({
        productName: item.product_name,
        productDescription: item.product_description,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
        preferredGrade: ''
      });
    }
  }, [alertsData?.lastDeliveredOrder, addItem]);

  const alerts = useMemo<DashboardAlert[]>(() => {
    if (!alertsData) return [];

    const allAlerts: DashboardAlert[] = [];

    // HIGH PRIORITY ALERTS

    // 1. Address Required (when no default address AND has pending orders)
    if (!alertsData.hasDefaultAddress) {
      allAlerts.push({
        id: 'address-required',
        type: 'address',
        title: 'Complete your delivery address',
        description: 'Add your delivery address to avoid delays on your orders.',
        ctaLabel: 'Add Address',
        ctaRoute: '/portal/addresses?add=true',
        priority: 'high',
        icon: 'map-pin'
      });
    }

    // 2. Payment Needed
    for (const order of alertsData.pendingPaymentOrders) {
      allAlerts.push({
        id: `payment-${order.id}`,
        type: 'payment',
        title: `Payment needed for Order #${order.order_number}`,
        description: 'Upload payment proof to continue processing your order.',
        ctaLabel: 'Upload Payment',
        ctaRoute: `/portal/orders?uploadPayment=${order.id}`,
        priority: 'high',
        icon: 'credit-card',
        orderId: order.id,
        orderNumber: order.order_number
      });
    }

    // 3. Unpaid Invoices
    for (const invoice of alertsData.unpaidInvoices.slice(0, 2)) {
      const orderNum = invoice.order?.order_number || 'Unknown';
      allAlerts.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Invoice pending for Order #${orderNum}`,
        description: 'Complete payment to avoid processing delays.',
        ctaLabel: 'View Invoice',
        ctaRoute: `/portal/invoices`,
        priority: 'high',
        icon: 'file-text',
        orderId: invoice.order_id
      });
    }

    // 3. Quote Expiring Soon
    for (const quote of alertsData.expiringQuotes) {
      const validUntil = new Date(quote.valid_until);
      const now = new Date();
      const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      allAlerts.push({
        id: `quote-expiring-${quote.id}`,
        type: 'quote-expiring',
        title: `Quote expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`,
        description: 'Review and accept to secure your pricing.',
        ctaLabel: 'Review Quote',
        ctaRoute: `/portal/quotes?open=${quote.id}`,
        priority: 'high',
        icon: 'clock',
        quoteId: quote.id,
        daysRemaining
      });
    }

    // MEDIUM PRIORITY ALERTS

    // 4. Reorder Last Order
    if (alertsData.lastDeliveredOrder) {
      allAlerts.push({
        id: 'reorder-last',
        type: 'reorder',
        title: 'Order again in seconds',
        description: 'Reorder your last delivery with one click.',
        ctaLabel: 'Reorder',
        ctaRoute: '/portal/cart',
        ctaAction: handleReorder,
        priority: 'medium',
        icon: 'refresh-cw',
        orderId: alertsData.lastDeliveredOrder.id,
        orderNumber: alertsData.lastDeliveredOrder.order_number
      });
    }

    // 5. Incomplete Profile
    if (alertsData.profileIncomplete) {
      allAlerts.push({
        id: 'profile-incomplete',
        type: 'profile',
        title: 'Complete your profile',
        description: 'Helps us process your orders faster.',
        ctaLabel: 'Update Profile',
        ctaRoute: '/portal/profile',
        priority: 'medium',
        icon: 'user'
      });
    }

    // Filter out dismissed alerts and sort by priority
    const priorityOrder: Record<AlertPriority, number> = {
      high: 0,
      medium: 1,
      low: 2
    };

    return allAlerts
      .filter(alert => !dismissedAlerts.has(alert.id))
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .slice(0, 4); // Max 4 alerts
  }, [alertsData, dismissedAlerts, handleReorder]);

  return {
    alerts,
    loading,
    fetchAlerts: fetchAlertsData,
    dismissAlert,
    hasAlerts: alerts.length > 0
  };
}
