import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const recaptchaSecretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");

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
  leadId: string;
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

    // Send admin notification email
    const adminEmailPromise = resend.emails.send({
      from: "Trust Link Ventures <onboarding@resend.dev>",
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
        <p><small>Lead ID: ${formData.leadId}</small></p>
        <p><small>View in admin portal: <a href="https://ppyfrftmexvgnsxlhdbz.supabase.co">Admin Dashboard</a></small></p>
      `,
    });

    // Send customer confirmation email
    const customerEmailPromise = resend.emails.send({
      from: "Trust Link Ventures <onboarding@resend.dev>",
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

    if (adminResult.error || customerResult.error) {
      console.error('[Contact Form] Email error:', adminResult.error || customerResult.error);
      throw new Error('Failed to send one or more emails');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Emails sent successfully',
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
