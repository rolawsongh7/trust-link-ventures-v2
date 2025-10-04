import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { responsibilityId, responsibilityName, mode } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update responsibility status to running
    await supabase
      .from('virtual_assistant_responsibilities')
      .update({ status: 'running', last_run_at: new Date().toISOString() })
      .eq('id', responsibilityId);

    // Log start
    await supabase.from('virtual_assistant_logs').insert({
      responsibility_id: responsibilityId,
      mode,
      responsibility_name: responsibilityName,
      action: 'started',
      status: 'running',
      details: { timestamp: new Date().toISOString() }
    });

    // Call Lovable AI for QA analysis
    const systemPrompt = `You are a QA testing assistant for Trust Link Ventures B2B Seafood Distribution Platform.
Your task is to perform automated quality assurance for: ${responsibilityName}.

Based on this responsibility, provide:
1. Test scenarios to execute
2. Expected outcomes
3. Potential issues to check
4. Recommendations

Return your response as a structured JSON object with keys: scenarios, checks, issues, recommendations.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Perform QA analysis for: ${responsibilityName}` }
        ],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    // Update responsibility status
    await supabase
      .from('virtual_assistant_responsibilities')
      .update({ status: 'completed' })
      .eq('id', responsibilityId);

    // Log completion
    await supabase.from('virtual_assistant_logs').insert({
      responsibility_id: responsibilityId,
      mode,
      responsibility_name: responsibilityName,
      action: 'completed',
      status: 'success',
      details: { 
        analysis,
        timestamp: new Date().toISOString()
      }
    });

    // Create report
    await supabase.from('virtual_assistant_reports').insert({
      mode,
      report_type: 'qa_analysis',
      summary: `QA analysis completed for ${responsibilityName}`,
      data: {
        responsibility: responsibilityName,
        analysis,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        message: `QA analysis completed for ${responsibilityName}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in virtual-assistant-qa:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});