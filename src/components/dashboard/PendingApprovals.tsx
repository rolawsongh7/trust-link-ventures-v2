import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PendingQuote {
  id: string;
  number: string;
  customer: string;
  amount: number;
  created_at: string;
  status: string;
}

export const PendingQuotes = () => {
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingQuotes();
  }, []);

  const fetchPendingQuotes = async () => {
    try {
      // Fetch quotes awaiting customer response (sent/quoted status)
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id, quote_number, total_amount, created_at, status, customers(company_name)')
        .in('status', ['sent', 'quoted'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const items: PendingQuote[] = [];

      quotes?.forEach((quote) => {
        items.push({
          id: quote.id,
          number: quote.quote_number,
          customer: (quote.customers as any)?.company_name || 'Unknown',
          amount: Number(quote.total_amount) || 0,
          created_at: quote.created_at,
          status: quote.status,
        });
      });

      setPendingQuotes(items);
    } catch (error) {
      console.error('Error fetching pending quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleViewQuote = (quoteId: string) => {
    navigate('/admin/quotes', { state: { viewQuoteId: quoteId } });
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
            <h2 className="text-lg font-semibold text-[#1E293B]">Pending Quotes</h2>
            <p className="text-sm text-[#64748B] mt-1">Quotes awaiting customer response</p>
            <p className="text-xs text-[#94A3B8] mt-2">
              Customers approve quotes directly from their portal. Admins can review, edit, or resend quotes here.
            </p>
          </div>
          {pendingQuotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3B82F6]/10 to-[#0EA5E9]/10 flex items-center justify-center">
                <FileText className="h-8 w-8 text-[#3B82F6]/50" />
              </div>
              <p className="text-[#64748B]">No pending quotes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQuotes.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl p-4 shadow-sm border border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white">
                          QUOTE #{item.number}
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A]">{item.customer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-[#64748B]">
                          <span className="font-semibold text-[#0F172A]">{formatCurrency(item.amount)}</span>
                          <span className="mx-2">•</span>
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          item.status === 'expired' 
                            ? 'bg-slate-100 text-slate-500' 
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {item.status === 'expired' ? 'Expired' : 'Awaiting Response'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleViewQuote(item.id)}
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white font-medium hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-1.5 min-h-[44px]"
                        aria-label={`View quote ${item.number}`}
                      >
                        <Eye className="h-4 w-4" />
                        View Quote
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

// Keep backward compatibility export
export const PendingApprovals = PendingQuotes;