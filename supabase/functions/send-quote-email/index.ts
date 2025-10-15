import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteEmailRequest {
  quoteId: string;
  customerEmail: string;
  customerName?: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, customerEmail, customerName, companyName }: SendQuoteEmailRequest = await req.json();

    if (!quoteId || !customerEmail) {
      throw new Error("Missing required fields: quoteId and customerEmail");
    }

    console.log("Processing quote email for:", { quoteId, customerEmail });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch quote details
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, customers(company_name, contact_name, email)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error(`Quote not found: ${quoteError?.message}`);
    }

    // Validate PDF exists
    if (!quote.final_file_url) {
      throw new Error("Quote PDF has not been generated yet");
    }

    console.log("Quote found:", quote.quote_number);

    // Get the PDF from storage
    const storagePath = quote.final_file_url.split('/quotes/')[1];
    if (!storagePath) {
      throw new Error("Invalid PDF storage path");
    }

    // Download the PDF file
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from("quotes")
      .download(storagePath);

    if (downloadError || !pdfData) {
      throw new Error(`Failed to download PDF: ${downloadError?.message}`);
    }

    console.log("PDF downloaded successfully");

    // Convert blob to base64
    const arrayBuffer = await pdfData.arrayBuffer();
    const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Determine recipient details
    const finalCustomerName = customerName || quote.customers?.contact_name || "Valued Customer";
    const finalCompanyName = companyName || quote.customers?.company_name || "Your Company";

    // Create magic link for quote approval
    const approvalUrl = `${supabaseUrl.replace('.supabase.co', '')}/quote-approval/${quoteId}`;

    // Send email to customer
    const customerEmailResponse = await resend.emails.send({
      from: "TrustLink Ventures <quotes@trustlinkventureslimited.com>",
      to: [customerEmail],
      subject: `Quote ${quote.quote_number} - ${finalCompanyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
              .content { background-color: #f9f9f9; padding: 30px; margin-top: 20px; }
              .button { display: inline-block; background-color: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
              .details { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #0066cc; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Quote from TrustLink Ventures</h1>
              </div>
              <div class="content">
                <h2>Dear ${finalCustomerName},</h2>
                <p>Thank you for your interest in our products and services.</p>
                <p>Please find attached our detailed quote for your review.</p>
                
                <div class="details">
                  <strong>Quote Number:</strong> ${quote.quote_number}<br>
                  <strong>Total Amount:</strong> ${quote.currency} ${Number(quote.total_amount).toLocaleString()}<br>
                  ${quote.valid_until ? `<strong>Valid Until:</strong> ${new Date(quote.valid_until).toLocaleDateString()}<br>` : ''}
                </div>

                <p>Please review the attached quote and let us know if you have any questions or would like to proceed with the order.</p>

                <p>You can also view and respond to this quote online:</p>
                <a href="${approvalUrl}" class="button">View Quote & Respond</a>

                <p>We look forward to working with you!</p>
                
                <p>Best regards,<br>
                <strong>TrustLink Ventures Team</strong></p>
              </div>
              <div class="footer">
                <p>TrustLink Ventures Limited<br>
                Email: info@trustlinkventureslimited.com</p>
              </div>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `quote-${quote.quote_number}.pdf`,
          content: base64Pdf,
        },
      ],
    });

    if (customerEmailResponse.error) {
      console.error("Error sending customer email:", customerEmailResponse.error);
      throw new Error(`Failed to send email to customer: ${customerEmailResponse.error.message}`);
    }

    console.log("Customer email sent successfully:", customerEmailResponse.data?.id);

    // Send copy to admin
    const adminEmailResponse = await resend.emails.send({
      from: "TrustLink Ventures <quotes@trustlinkventureslimited.com>",
      to: ["info@trustlinkventureslimited.com"],
      subject: `[COPY] Quote ${quote.quote_number} sent to ${finalCompanyName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Quote Sent Notification</h2>
              <p>The following quote has been sent to the customer:</p>
              <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
                <strong>Quote Number:</strong> ${quote.quote_number}<br>
                <strong>Customer:</strong> ${finalCompanyName}<br>
                <strong>Contact:</strong> ${finalCustomerName}<br>
                <strong>Email:</strong> ${customerEmail}<br>
                <strong>Amount:</strong> ${quote.currency} ${Number(quote.total_amount).toLocaleString()}<br>
                <strong>Sent At:</strong> ${new Date().toLocaleString()}
              </div>
              <p>A copy of the quote PDF is attached.</p>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: `quote-${quote.quote_number}.pdf`,
          content: base64Pdf,
        },
      ],
    });

    if (adminEmailResponse.error) {
      console.error("Warning: Admin email failed:", adminEmailResponse.error);
      // Don't fail the whole request if admin email fails
    }

    // Update quote status and sent_at timestamp
    const { error: updateError } = await supabase
      .from("quotes")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    if (updateError) {
      console.error("Warning: Failed to update quote status:", updateError);
    }

    console.log("Quote email process completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Quote email sent successfully",
        customerEmailId: customerEmailResponse.data?.id,
        adminEmailId: adminEmailResponse.data?.id,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-quote-email function:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to send quote email",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
