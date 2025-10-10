import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate lead scores based on activity
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('id, customer_id, status');

    if (fetchError) throw fetchError;

    let updatedCount = 0;
    if (leads && leads.length > 0) {
      for (const lead of leads) {
        let score = 0;

        // Check for email activities (simulated - in real app, track email opens/clicks)
        const { data: communications } = await supabase
          .from('communications')
          .select('id, communication_type')
          .eq('lead_id', lead.id);

        if (communications) {
          // +10 points per email communication
          score += communications.filter(c => c.communication_type === 'email').length * 10;
        }

        // Check for quote requests
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .eq('customer_id', lead.customer_id);

        if (quotes) {
          // +30 points per quote requested
          score += quotes.length * 30;
        }

        // Check for orders placed
        const { data: orders } = await supabase
          .from('orders')
          .select('id')
          .eq('customer_id', lead.customer_id);

        if (orders) {
          // +50 points per order placed
          score += orders.length * 50;
        }

        // Status-based scoring
        const statusScores: Record<string, number> = {
          new: 10,
          contacted: 20,
          qualified: 40,
          proposal: 60,
          negotiation: 70,
          closed_won: 100,
          closed_lost: 0,
        };
        score += statusScores[lead.status] || 0;

        // Cap at 100
        score = Math.min(score, 100);

        // Update lead score
        const { error: updateError } = await supabase
          .from('leads')
          .update({ lead_score: score })
          .eq('id', lead.id);

        if (!updateError) {
          updatedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Updated scores for ${updatedCount} leads`,
        leadsProcessed: leads?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
