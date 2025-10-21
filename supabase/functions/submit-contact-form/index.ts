import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const recaptchaSecretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactFormData {
  name: string;
  company?: string;
  email: string;
  country: string;
  inquiryType: string;
  message: string;
  recaptchaToken: string;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!recaptchaSecretKey) {
    console.error('[Contact Form] RECAPTCHA_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecretKey}&response=${token}`,
    });

    const data = await response.json();
    console.log('[Contact Form] reCAPTCHA verification result:', data.success);
    return data.success === true;
  } catch (error) {
    console.error('[Contact Form] reCAPTCHA verification error:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log('[Contact Form] Function invoked');
  console.log('[Contact Form] RESEND_API_KEY present:', !!Deno.env.get("RESEND_API_KEY"));
  console.log('[Contact Form] RECAPTCHA_SECRET_KEY present:', !!Deno.env.get("RECAPTCHA_SECRET_KEY"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData: ContactFormData = await req.json();
    console.log('[Contact Form] Processing submission for:', formData.email);

    // Verify reCAPTCHA token
    const isValidRecaptcha = await verifyRecaptcha(formData.recaptchaToken);
    if (!isValidRecaptcha) {
      console.error('[Contact Form] reCAPTCHA verification failed');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'reCAPTCHA verification failed. Please try again.' 
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Step 1: Find or create customer
    let customerId: string | null = null;
    
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('[Contact Form] Found existing customer:', customerId);
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabaseAdmin
        .from('customers')
        .insert({
          company_name: formData.company || formData.name,
          contact_name: formData.name,
          email: formData.email,
          country: formData.country,
          customer_status: 'prospect',
          priority: formData.inquiryType === 'Request a Quote' ? 'high' : 'medium'
        })
        .select('id')
        .single();
      
      if (customerError) {
        console.error('[Contact Form] Customer creation error:', customerError);
        throw customerError;
      }
      customerId = newCustomer.id;
      console.log('[Contact Form] Created new customer:', customerId);
    }
    
    // Step 2: Create lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        customer_id: customerId,
        title: `${formData.inquiryType || 'Contact Form'} - ${formData.name}`,
        description: formData.message,
        source: 'contact_form',
        status: 'new',
        lead_score: formData.inquiryType === 'Request a Quote' ? 80 : 60
      })
      .select('id')
      .single();
    
    if (leadError) {
      console.error('[Contact Form] Lead creation error:', leadError);
      throw leadError;
    }
    console.log('[Contact Form] Created lead:', lead.id);
    
    // Step 3: Log communication
    const { error: commError } = await supabaseAdmin
      .from('communications')
      .insert({
        customer_id: customerId,
        lead_id: lead.id,
        communication_type: 'email',
        direction: 'inbound',
        subject: `Contact Form: ${formData.inquiryType || 'General Inquiry'}`,
        content: `From: ${formData.name} (${formData.email})\nCompany: ${formData.company || 'N/A'}\nCountry: ${formData.country}\nInquiry Type: ${formData.inquiryType || 'N/A'}\n\nMessage:\n${formData.message}`,
        contact_person: formData.name
      });
    
    if (commError) {
      console.error('[Contact Form] Communication logging error:', commError);
      throw commError;
    }
    console.log('[Contact Form] Logged communication');

    // Send admin notification email
    const adminEmailPromise = resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: ["trustlventuresghana_a01@yahoo.com"],
      subject: `New Contact Form: ${formData.inquiryType} - ${formData.name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Inquiry Type:</strong> ${formData.inquiryType}</p>
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>Company:</strong> ${formData.company || 'N/A'}</p>
        <p><strong>Email:</strong> ${formData.email}</p>
        <p><strong>Country:</strong> ${formData.country}</p>
        <p><strong>Message:</strong></p>
        <p>${formData.message || 'No message provided'}</p>
        <hr>
        <p><small>Lead ID: ${lead.id}</small></p>
        <p><small>View in admin portal: <a href="https://ppyfrftmexvgnsxlhdbz.supabase.co">Admin Dashboard</a></small></p>
      `,
    });

    // Send customer confirmation email
    const customerEmailPromise = resend.emails.send({
      from: "Trust Link Ventures <info@trustlinkcompany.com>",
      to: [formData.email],
      subject: "Thank you for contacting Trust Link Ventures",
      html: `
        <h2>Thank you for reaching out, ${formData.name}!</h2>
        <p>We've received your inquiry regarding <strong>${formData.inquiryType}</strong> and will get back to you shortly.</p>
        <p>Our team typically responds within:</p>
        <ul>
          <li><strong>Request a Quote:</strong> 4-6 hours</li>
          <li><strong>Pitch a Partnership:</strong> 1 business day</li>
          <li><strong>Investor Opportunities:</strong> 2 business days</li>
          <li><strong>General Contact:</strong> 1 business day</li>
        </ul>
        <p>In the meantime, feel free to explore:</p>
        <ul>
          <li><a href="https://trustlinkventures.com/about">Our Sustainability Commitments</a></li>
          <li><a href="https://trustlinkventures.com/partners">Our Partner Network</a></li>
          <li><a href="https://trustlinkventures.com/products">Our Products</a></li>
        </ul>
        <p>Best regards,<br>The Trust Link Ventures Team</p>
        <hr>
        <p><small>This is an automated confirmation. Please do not reply to this email.</small></p>
      `,
    });

    // Wait for both emails to send
    const [adminResult, customerResult] = await Promise.all([
      adminEmailPromise,
      customerEmailPromise,
    ]);

    console.log('[Contact Form] Admin email result:', adminResult);
    console.log('[Contact Form] Customer email result:', customerResult);

    // Don't fail the whole request if emails fail - data is already saved
    if (adminResult.error || customerResult.error) {
      console.error('[Contact Form] Email warning:', adminResult.error || customerResult.error);
      // Continue anyway - the lead was saved successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Contact form submitted successfully',
        leadId: lead.id,
        customerId: customerId,
        adminEmailId: adminResult.data?.id,
        customerEmailId: customerResult.data?.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[Contact Form] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
