import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Check, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PendingItem {
  id: string;
  type: 'quote' | 'order';
  number: string;
  customer: string;
  amount: number;
  created_at: string;
}

export const PendingApprovals = () => {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      // Fetch quotes pending approval (sent status)
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, total_amount, created_at, customers(company_name)')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch orders pending approval
      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, total_amount, created_at, customers(company_name)')
        .eq('status', 'quote_pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const items: PendingItem[] = [];

      quotes?.forEach((quote) => {
        items.push({
          id: quote.id,
          type: 'quote',
          number: quote.quote_number,
          customer: (quote.customers as any)?.company_name || 'Unknown',
          amount: Number(quote.total_amount) || 0,
          created_at: quote.created_at,
        });
      });

      orders?.forEach((order) => {
        items.push({
          id: order.id,
          type: 'order',
          number: order.order_number,
          customer: (order.customers as any)?.company_name || 'Unknown',
          amount: Number(order.total_amount) || 0,
          created_at: order.created_at,
        });
      });

      // Sort by date
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setPendingItems(items.slice(0, 5));
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: PendingItem) => {
    try {
      if (item.type === 'quote') {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'accepted', approved_at: new Date().toISOString() })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Quote approved successfully');
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Order approved successfully');
      }
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (item: PendingItem) => {
    try {
      if (item.type === 'quote') {
        const { error } = await supabase
          .from('quotes')
          .update({ status: 'rejected' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Quote rejected');
      } else {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Order cancelled');
      }
      fetchPendingApprovals();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      {loading ? (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="mb-6">
            <div className="h-6 bg-[#E2E8F0] rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-[#E2E8F0] rounded w-1/2"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0]">
                <div className="h-4 bg-[#E2E8F0] rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-[#E2E8F0] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#1E293B]">Pending Approvals</h2>
            <p className="text-sm text-[#64748B] mt-1">Items awaiting your review</p>
          </div>
          {pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-[#0EA5E9]/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-[#3B82F6]/50" />
              </div>
              <p className="text-[#64748B]">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                          item.type === 'quote' 
                            ? 'bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white' 
                            : 'bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] text-white'
                        }`}>
                          {item.type.toUpperCase()} #{item.number}
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A]">{item.customer}</span>
                      </div>
                      <p className="text-sm text-[#64748B]">
                        <span className="font-semibold text-[#0F172A]">{formatCurrency(item.amount)}</span>
                        <span className="mx-2">•</span>
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          if (item.type === 'quote') {
                            navigate('/admin/quotes');
                          } else {
                            navigate('/admin/orders');
                          }
                        }}
                        className="px-3 py-2 rounded-lg border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all duration-200"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(item)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(item)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
