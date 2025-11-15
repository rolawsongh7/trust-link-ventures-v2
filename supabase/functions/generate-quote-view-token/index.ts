import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { quoteId, customerEmail } = await req.json()

    console.log('Generating quote view token for:', { quoteId, customerEmail })

    // Validate quote exists and belongs to customer
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      console.error('Quote not found:', quoteError)
      return new Response(
        JSON.stringify({ success: false, error: 'Quote not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Generate secure token
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Insert token into database
    const { data: tokenData, error: tokenError } = await supabase
      .from('quote_view_tokens')
      .insert({
        quote_id: quoteId,
        token: token,
        customer_email: customerEmail,
        expires_at: expiresAt.toISOString(),
        access_count: 0
      })
      .select()
      .single()

    if (tokenError) {
      console.error('Error creating token:', tokenError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create view token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Generate view link
    const origin = req.headers.get('origin') || 'https://trustlinkcompany.com'
    const viewLink = `${origin}/quote-view/${token}`

    // Log token generation
    await supabase.from('audit_logs').insert({
      event_type: 'quote_view_token_generated',
      action: 'generate',
      resource_type: 'quote',
      resource_id: quoteId,
      event_data: {
        quote_number: quote.quote_number,
        customer_email: customerEmail,
        token_id: tokenData.id,
        expires_at: expiresAt.toISOString()
      },
      severity: 'low'
    })

    console.log('Token generated successfully:', viewLink)

    return new Response(
      JSON.stringify({ 
        success: true, 
        token, 
        viewLink,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-quote-view-token:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})