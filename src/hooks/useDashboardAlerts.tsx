import { useMemo, useState, useCallback, useEffect } from 'react';
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
  pendingPaymentOrders: Array<{ id: string; order_number: string; payment_proof_url: string | null }>;
  unpaidInvoices: Array<{ id: string; order_id: string; order?: { order_number: string } }>;
  expiringQuotes: Array<{ id: string; quote_number: string; valid_until: string }>;
  lastDeliveredOrder: { id: string; order_number: string; order_items: any[] } | null;
  profileIncomplete: boolean;
  pendingCustomerIssues: Array<{ id: string; issue_type: string; order_number: string }>;
  ordersNeedingAddress: Array<{ id: string; order_number: string }>;
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
        deliveredOrderResult,
        issuesResult,
        ordersNeedingAddressResult
      ] = await Promise.all([
        // Check for default address
        supabase
          .from('customer_addresses')
          .select('id')
          .eq('customer_id', customerId)
          .eq('is_default', true)
          .limit(1),
        
        // Get orders needing payment (include payment_proof_url to filter already-uploaded)
        supabase
          .from('orders')
          .select('id, order_number, status, payment_proof_url')
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
          .limit(1),

        // Get order issues under review (may need customer response)
        supabase
          .from('order_issues')
          .select('id, issue_type, orders!inner(order_number)')
          .eq('customer_id', customerId)
          .eq('status', 'reviewing'),

        // Get orders needing address
        supabase
          .from('orders')
          .select('id, order_number')
          .eq('customer_id', customerId)
          .is('delivery_address_id', null)
          .in('status', ['payment_received', 'processing', 'order_confirmed'])
      ]);

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

      // Process issues data
      const pendingCustomerIssues = (issuesResult.data || []).map(issue => ({
        id: issue.id,
        issue_type: issue.issue_type,
        order_number: (issue.orders as any)?.order_number || 'Unknown'
      }));

      setAlertsData({
        hasDefaultAddress: (addressesResult.data?.length || 0) > 0,
        pendingPaymentOrders: (ordersResult.data || []).map(o => ({
          id: o.id,
          order_number: o.order_number,
          payment_proof_url: o.payment_proof_url
        })),
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
        profileIncomplete,
        pendingCustomerIssues,
        ordersNeedingAddress: ordersNeedingAddressResult.data || []
      });

      // Clear stale dismissed alerts that no longer have matching data
      setDismissedAlerts(prev => {
        const newSet = new Set<string>();
        prev.forEach(id => {
          // Only keep dismissals for alerts that still exist in fresh data
          if (id.startsWith('payment-') || id.startsWith('issue-') || 
              id.startsWith('address-order-') || id.startsWith('quote-expiring-')) {
            // These are dynamic - keep them for this session
            newSet.add(id);
          }
        });
        sessionStorage.setItem('dismissedAlerts', JSON.stringify([...newSet]));
        return newSet;
      });
    } catch (error) {
      console.error('Error fetching alerts data:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, user?.id, profile?.company_name, profile?.full_name, profile?.phone]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('dashboard-alerts-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchAlertsData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'order_issues' },
        () => fetchAlertsData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'quotes' },
        () => fetchAlertsData()
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchAlertsData()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, fetchAlertsData]);

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

    // 1. Orders needing address (order-specific)
    for (const order of alertsData.ordersNeedingAddress) {
      allAlerts.push({
        id: `address-order-${order.id}`,
        type: 'address',
        title: `Address needed for Order #${order.order_number}`,
        description: 'Add a delivery address to continue processing.',
        ctaLabel: 'Add Address',
        ctaRoute: `/portal/orders?addressNeeded=${order.id}`,
        priority: 'high',
        icon: 'map-pin',
        orderId: order.id,
        orderNumber: order.order_number
      });
    }

    // Fallback: No default address and no pending orders
    if (!alertsData.hasDefaultAddress && alertsData.ordersNeedingAddress.length === 0) {
      allAlerts.push({
        id: 'address-required',
        type: 'address',
        title: 'Complete your delivery address',
        description: 'Add your delivery address to avoid delays on your orders.',
        ctaLabel: 'Add Address',
        ctaRoute: '/portal/addresses?add=true',
        priority: 'medium',
        icon: 'map-pin'
      });
    }

    // 2. Payment Needed - FILTER OUT orders that already have payment proof
    for (const order of alertsData.pendingPaymentOrders.filter(o => !o.payment_proof_url)) {
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

    // 3. Order Issues awaiting customer response
    for (const issue of alertsData.pendingCustomerIssues) {
      allAlerts.push({
        id: `issue-${issue.id}`,
        type: 'issue',
        title: `Response needed for Order #${issue.order_number}`,
        description: 'Support team needs more information from you.',
        ctaLabel: 'View Issue',
        ctaRoute: `/portal/order-issues?issueId=${issue.id}`,
        priority: 'high',
        icon: 'alert-circle'
      });
    }

    // 4. Unpaid Invoices
    for (const invoice of alertsData.unpaidInvoices.slice(0, 2)) {
      const orderNum = invoice.order?.order_number || 'Unknown';
      allAlerts.push({
        id: `invoice-${invoice.id}`,
        type: 'invoice',
        title: `Invoice pending for Order #${orderNum}`,
        description: 'Complete payment to avoid processing delays.',
        ctaLabel: 'View Invoice',
        ctaRoute: `/portal/invoices?highlight=${invoice.id}`,
        priority: 'high',
        icon: 'file-text',
        orderId: invoice.order_id
      });
    }

    // 5. Quote Expiring Soon
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

    // 6. Reorder Last Order
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

    // 7. Incomplete Profile
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
