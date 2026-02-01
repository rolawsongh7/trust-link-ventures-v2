import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'welcome' | 'password-reset' | 'security-alert' | 'quote-confirmation' | 'verification' | 'quote_ready' | 'quote_accepted' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'new_quote_request_admin' | 'account_deleted' | 'support_reply' | 'payment_verified' | 'payment_rejected' | 'payment_clarification_needed' | 'order_issue_reply' | 'order_issue_status_change' | 'pod_uploaded' | 'automated_customer_notification';
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    let html = '';
    let from = "Trust Link Ventures <info@trustlinkcompany.com>";

    switch (type) {
      case 'welcome':
        html = generateWelcomeEmail(data?.name || 'User');
        break;
      case 'password-reset':
        html = generatePasswordResetEmail(data?.resetLink || '', data?.name || 'User');
        break;
      case 'security-alert':
        html = generateSecurityAlertEmail(data?.alertType || 'Login from new device', data?.details || {});
        break;
      case 'quote-confirmation':
        html = generateQuoteConfirmationEmail(data);
        break;
      case 'verification':
        html = generateVerificationEmail(data?.verificationLink || '', data?.name || 'User');
        break;
      case 'quote_ready':
        html = generateQuoteReadyEmail(data);
        break;
      case 'quote_accepted':
        html = generateQuoteAcceptedEmail(data);
        break;
      case 'order_confirmed':
        html = generateOrderConfirmedEmail(data);
        break;
      case 'order_shipped':
        html = generateOrderShippedEmail(data);
        break;
      case 'order_delivered':
        html = generateOrderDeliveredEmail(data);
        break;
      case 'new_quote_request_admin':
        html = generateAdminQuoteNotificationEmail(data);
        break;
      case 'account_deleted':
        html = generateAccountDeletedEmail(data);
        break;
      case 'support_reply':
        html = generateSupportReplyEmail(data);
        from = "Trust Link Support <support@trustlinkcompany.com>";
        break;
      case 'payment_verified':
        html = generatePaymentVerifiedEmail(data);
        break;
      case 'payment_rejected':
        html = generatePaymentRejectedEmail(data);
        break;
      case 'payment_clarification_needed':
        html = generatePaymentClarificationEmail(data);
        break;
      case 'order_issue_reply':
        html = generateOrderIssueReplyEmail(data);
        from = "Trust Link Support <support@trustlinkcompany.com>";
        break;
      case 'order_issue_status_change':
        html = generateOrderIssueStatusChangeEmail(data);
        from = "Trust Link Support <support@trustlinkcompany.com>";
        break;
      case 'pod_uploaded':
        html = generatePODUploadedEmail(data);
        break;
      case 'automated_customer_notification':
        html = generateAutomatedCustomerNotificationEmail(data);
        from = "Trust Link Ventures <info@trustlinkcompany.com>";
        break;
      default:
        throw new Error('Invalid email type');
    }

    const emailResponse = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function generateWelcomeEmail(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Trust Link Ventures!</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>Welcome to Trust Link Ventures! We're excited to have you as part of our global community of trusted partnerships.</p>
          <p>Our platform offers:</p>
          <ul>
            <li>Sustainable venture building and partnerships</li>
            <li>Trusted food exports and sourcing</li>
            <li>Global reach with measurable impact</li>
            <li>Ethical sourcing and innovative solutions</li>
          </ul>
          <p>Get started by exploring our services and connecting with our global network.</p>
          <a href="${Deno.env.get('SUPABASE_URL')}" class="button">Explore Services</a>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures</p>
          <p>If you have any questions, feel free to contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePasswordResetEmail(resetLink: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>We received a request to reset your password for your Trust Link Ventures account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <div class="warning">
            <strong>Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>For security, never share this link with others</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          <p>If the button doesn't work, copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSecurityAlertEmail(alertType: string, details: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .alert { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Security Alert</h1>
        </div>
        <div class="content">
          <p>We detected unusual activity on your account:</p>
          <div class="alert">
            <h3>${alertType}</h3>
            <p><strong>Time:</strong> ${details.timestamp || new Date().toLocaleString()}</p>
            <p><strong>Location:</strong> ${details.location || 'Unknown'}</p>
            <p><strong>IP Address:</strong> ${details.ipAddress || 'Unknown'}</p>
            <p><strong>Device:</strong> ${details.device || 'Unknown'}</p>
          </div>
          <p>If this was you, no action is needed. If you don't recognize this activity, please secure your account immediately.</p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures Security Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteConfirmationEmail(data: any): string {
  const itemsHtml = data?.items?.map((item: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.productName}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.preferredGrade || 'Standard'}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.specifications || '-'}</td>
    </tr>
  `).join('') || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .quote-details { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #28a745; color: white; padding: 12px; text-align: left; }
        .message-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Quote Request Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          <p>Thank you for your quote request! We have received your inquiry and our team will review it shortly.</p>
          
          <div class="quote-details">
            <h3>Quote Details:</h3>
            <p><strong>Request Number:</strong> ${data?.quoteNumber || 'N/A'}</p>
            <p><strong>Company:</strong> ${data?.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${data?.contactName || data?.customerName || 'N/A'}</p>
            <p><strong>Industry:</strong> ${data?.industry || 'N/A'}</p>
          </div>

          ${data?.items && data.items.length > 0 ? `
            <div style="margin: 20px 0;">
              <h3>Requested Products (${data.items.length} items):</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: center;">Unit</th>
                    <th>Grade</th>
                    <th>Specifications</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${data?.message && data.message !== 'No additional notes provided' ? `
            <div class="message-box">
              <h4 style="margin-top: 0;">Your Message:</h4>
              <p style="margin-bottom: 0;">${data.message}</p>
            </div>
          ` : ''}

          <p>Our team will contact you within 24-48 hours with a detailed quote and partnership proposal.</p>
          <p>If you have any urgent questions, please contact us at <a href="mailto:info@trustlinkcompany.com">info@trustlinkcompany.com</a></p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures</p>
          <p style="font-size: 12px; color: #666;">This is an automated confirmation. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateVerificationEmail(verificationLink: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Dear ${name},</p>
          <p>Please verify your email address to complete your account setup with Trust Link Ventures.</p>
          <a href="${verificationLink}" class="button">Verify Email Address</a>
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteReadyEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Your Quote is Ready!</h1>
        </div>
        <div class="content">
          <p>Good news! Your quote <strong>${data?.quoteNumber}</strong> is now ready for review.</p>
          <a href="${data?.customerPortalLink}" class="button">View Quote</a>
          <p>Log in to your customer portal to review the details and accept the quote.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteAcceptedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Quote Accepted</h1>
        </div>
        <div class="content">
          <p>Quote <strong>${data?.quoteNumber}</strong> has been accepted by the customer.</p>
          <p><strong>Customer Email:</strong> ${data?.customerEmail}</p>
          <p>Please process this order accordingly.</p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderConfirmedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🛒 Order Confirmed!</h1>
        </div>
        <div class="content">
          <p>Your order <strong>${data?.orderNumber}</strong> has been confirmed and is being processed.</p>
          <a href="${data?.trackingLink}" class="button">Track Order</a>
          <p>You can track your order status anytime from your customer portal.</p>
        </div>
        <div class="footer">
          <p>Thank you for your business!<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderShippedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .info-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 Order Shipped!</h1>
        </div>
        <div class="content">
          <p>Great news! Your order <strong>${data?.orderNumber}</strong> has been shipped.</p>
          ${data?.trackingNumber ? `
            <div class="info-box">
              <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            </div>
          ` : ''}
          <a href="${data?.trackingLink}" class="button">Track Shipment</a>
          <p>You can track your shipment progress from your customer portal.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>Trust Link Ventures Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderDeliveredEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Order Delivered!</h1>
        </div>
        <div class="content">
          <p>Your order <strong>${data?.orderNumber}</strong> has been successfully delivered.</p>
          <p>We hope you're satisfied with your purchase. If you have any questions or concerns, please don't hesitate to contact us.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures!<br>We look forward to serving you again.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAdminQuoteNotificationEmail(data: any): string {
  const itemsHtml = data?.items?.map((item: any) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.productName}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center;">${item.unit}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.preferredGrade || 'Standard'}</td>
      <td style="padding: 10px; border: 1px solid #e0e0e0;">${item.specifications || '-'}</td>
    </tr>
  `).join('') || '';

  const urgencyColor = data?.urgency === 'high' ? '#dc3545' : data?.urgency === 'low' ? '#28a745' : '#ffc107';
  const urgencyLabel = (data?.urgency || 'medium').toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .customer-card { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #667eea; color: white; padding: 12px; text-align: left; }
        .urgency-badge { display: inline-block; padding: 5px 12px; border-radius: 4px; color: white; font-weight: bold; font-size: 12px; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        .message-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 New Quote Request</h1>
          <p style="margin: 0; font-size: 18px;">Quote ${data?.quoteNumber || 'N/A'}</p>
        </div>
        <div class="content">
          <div style="margin-bottom: 20px;">
            <span class="urgency-badge" style="background-color: ${urgencyColor};">
              ${urgencyLabel} PRIORITY
            </span>
          </div>

          <h3>Customer Information:</h3>
          <div class="customer-card">
            <p><strong>Company:</strong> ${data?.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${data?.customerName || 'N/A'}</p>
            <p><strong>Email:</strong> <a href="mailto:${data?.customerEmail}">${data?.customerEmail || 'N/A'}</a></p>
            <p><strong>Phone:</strong> ${data?.customerPhone || 'Not provided'}</p>
            <p><strong>Country:</strong> ${data?.country || 'Not provided'}</p>
            <p><strong>Industry:</strong> ${data?.industry || 'N/A'}</p>
          </div>

          ${data?.items && data.items.length > 0 ? `
            <h3>Requested Products (${data.items.length} items):</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Quantity</th>
                  <th style="text-align: center;">Unit</th>
                  <th>Grade</th>
                  <th>Specifications</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          ` : ''}

          ${data?.message && data.message !== 'No additional notes' ? `
            <div class="message-box">
              <h4 style="margin-top: 0;">Customer Message:</h4>
              <p style="margin-bottom: 0;">${data.message}</p>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${data?.dashboardLink}" class="button">View in Dashboard</a>
            <a href="mailto:${data?.customerEmail}?subject=Re: Quote Request ${data?.quoteNumber}" class="button" style="background: #28a745;">Respond to Customer</a>
          </div>

          <p style="font-size: 14px; color: #666;">
            <strong>Next Steps:</strong><br>
            1. Review customer requirements and product specifications<br>
            2. Prepare a detailed quote with pricing and terms<br>
            3. Send quote to customer within 24-48 hours
          </p>
        </div>
        <div class="footer">
          <p>Trust Link Ventures Admin System</p>
          <p style="font-size: 12px; color: #666;">This is an automated notification from your quote management system.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAccountDeletedEmail(data: any): string {
  const deletedAt = data?.deletedAt ? new Date(data.deletedAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  }) : new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .info-box { background: #f8f9fa; border: 1px solid #e0e0e0; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .deleted-list { margin: 15px 0; padding-left: 20px; }
        .deleted-list li { margin: 8px 0; color: #555; }
        .notice { background: #e7f3ff; border: 1px solid #b3d7ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Deletion Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.name || 'Valued Customer'},</p>
          
          <p>This email confirms that your Trust Link Ventures account has been <strong>permanently deleted</strong> as requested.</p>
          
          <div class="info-box">
            <p><strong>Deletion Date:</strong> ${deletedAt}</p>
            ${data?.reason && data.reason !== 'Not specified' ? `<p><strong>Reason Provided:</strong> ${data.reason}</p>` : ''}
          </div>

          <h3>What Was Removed:</h3>
          <ul class="deleted-list">
            <li>Your account profile and login credentials</li>
            <li>Saved delivery addresses</li>
            <li>Notification preferences and settings</li>
            <li>Security settings and device information</li>
            <li>Shopping cart items</li>
            <li>Communication history</li>
          </ul>

          <div class="notice">
            <strong>Note:</strong> For business record-keeping purposes, your order and quote history has been anonymized but retained. Your personal information has been removed from these records.
          </div>

          <p>If you did not request this deletion or believe this was done in error, please contact our support team immediately at <a href="mailto:info@trustlinkcompany.com">info@trustlinkcompany.com</a>.</p>

          <p>We're sorry to see you go. If you ever wish to return, you're always welcome to create a new account.</p>

          <p>Thank you for being a part of Trust Link Ventures.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Team</strong></p>
          <p style="font-size: 12px; color: #888;">This is a final confirmation email. No further action is required on your part.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateSupportReplyEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .message-box { background: #f8f9fa; border-left: 4px solid #0066cc; padding: 20px; margin: 20px 0; }
        .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .ref-box { background: #e7f3ff; padding: 10px 15px; border-radius: 6px; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Message from Trust Link Support</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          
          <p>We have received your inquiry and here is our response:</p>
          
          <div class="ref-box">
            <strong>Reference:</strong> ${data?.threadSubject || 'Support Inquiry'}
          </div>

          <div class="message-box">
            ${(data?.content || '').replace(/\n/g, '<br>')}
          </div>

          ${data?.orderId ? `<p><strong>Related Order:</strong> ${data.orderNumber || data.orderId}</p>` : ''}

          <p>If you have any further questions, please reply to this email or contact us through your customer portal.</p>

          ${data?.portalLink ? `<a href="${data.portalLink}" class="button">View in Customer Portal</a>` : ''}
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Support Team</strong></p>
          <p style="font-size: 12px; color: #888;">Do not reply directly to this email. Use your customer portal or contact support@trustlinkcompany.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentVerifiedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .info-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Payment Verified!</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          
          <p>Great news! Your payment for order <strong>${data?.orderNumber}</strong> has been verified and confirmed.</p>
          
          <div class="info-box">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <div class="detail-row">
              <span>Order Number:</span>
              <strong>${data?.orderNumber || 'N/A'}</strong>
            </div>
            <div class="detail-row">
              <span>Amount Confirmed:</span>
              <strong>${data?.currency || 'GHS'} ${(data?.amount || 0).toLocaleString()}</strong>
            </div>
            <div class="detail-row">
              <span>Payment Reference:</span>
              <strong>${data?.reference || 'N/A'}</strong>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span>Verified On:</span>
              <strong>${data?.verifiedAt ? new Date(data.verifiedAt).toLocaleString() : new Date().toLocaleString()}</strong>
            </div>
          </div>

          <h3>What Happens Next?</h3>
          <p>Your order is now being processed. Here's what to expect:</p>
          <ol>
            <li><strong>Processing:</strong> We're preparing your order</li>
            <li><strong>Ready to Ship:</strong> Your order will be packaged</li>
            <li><strong>Shipped:</strong> Your order is on its way</li>
            <li><strong>Delivered:</strong> Your order arrives at your location</li>
          </ol>

          <p>You can track your order status anytime from your customer portal.</p>
          
          <a href="${data?.trackingLink || '#'}" class="button">Track Your Order</a>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p><strong>Trust Link Ventures Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentRejectedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning-box { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .reason-box { background: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Payment Proof Rejected</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          
          <p>Unfortunately, we were unable to verify the payment proof you submitted for order <strong>${data?.orderNumber}</strong>.</p>
          
          <div class="warning-box">
            <h3 style="margin-top: 0; color: #721c24;">Rejection Reason</h3>
            <p style="margin-bottom: 0;">${data?.reason || 'The payment proof could not be verified. Please submit a new proof of payment.'}</p>
          </div>

          <div class="reason-box">
            <h4 style="margin-top: 0;">What You Need To Do</h4>
            <ol>
              <li>Ensure your payment was successfully processed</li>
              <li>Take a clear screenshot or photo of your payment confirmation</li>
              <li>Make sure the transaction reference and amount are visible</li>
              <li>Upload the new payment proof through your customer portal</li>
            </ol>
          </div>

          <p>Your order will remain on hold until we can verify your payment. If you believe this was an error or need assistance, please contact our support team.</p>
          
          <a href="${data?.portalLink || '#'}" class="button">Upload New Payment Proof</a>
          
          <p style="margin-top: 20px;">
            <strong>Need Help?</strong><br>
            Contact us at <a href="mailto:info@trustlinkcompany.com">info@trustlinkcompany.com</a>
          </p>
        </div>
        <div class="footer">
          <p>We're here to help!</p>
          <p><strong>Trust Link Ventures Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePaymentClarificationEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #fd7e14; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #fd7e14; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .message-box { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Clarification Needed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          
          <p>We're reviewing your payment for order <strong>${data?.orderNumber}</strong> and need some additional information before we can proceed.</p>
          
          <div class="message-box">
            <h3 style="margin-top: 0;">Message from Our Team</h3>
            <p style="margin-bottom: 0;">${data?.message || 'Please provide additional information about your payment.'}</p>
          </div>

          <p>Please respond by:</p>
          <ul>
            <li>Uploading additional payment proof if needed</li>
            <li>Contacting our support team with the requested information</li>
            <li>Replying through your customer portal</li>
          </ul>

          <p>Your order is on hold pending this clarification. We appreciate your prompt response.</p>
          
          <a href="${data?.portalLink || '#'}" class="button">Respond Now</a>
        </div>
        <div class="footer">
          <p>Thank you for your patience!</p>
          <p><strong>Trust Link Ventures Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderIssueReplyEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .order-box { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💬 New Reply to Your Issue</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Our support team has responded to your issue report for <strong>Order #${data?.orderNumber || 'N/A'}</strong>.</p>
          
          <div class="order-box">
            <p><strong>Order:</strong> #${data?.orderNumber || 'N/A'}</p>
            <p><strong>Issue ID:</strong> ${data?.issueId || 'N/A'}</p>
          </div>

          <p>Please log in to your customer portal to view the full response and reply if needed.</p>
          
          <a href="${data?.customerPortalLink || '#'}" class="button">View Response</a>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Support Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateOrderIssueStatusChangeEmail(data: any): string {
  const statusMessages: Record<string, { color: string; icon: string; message: string }> = {
    'reviewing': { color: '#eab308', icon: '🔍', message: 'Your issue is now under review by our team.' },
    'resolved': { color: '#22c55e', icon: '✅', message: 'Great news! Your issue has been resolved.' },
    'rejected': { color: '#ef4444', icon: '❌', message: 'Your issue report has been reviewed and closed.' },
    'submitted': { color: '#3b82f6', icon: '📋', message: 'Your issue has been submitted and is awaiting review.' }
  };
  
  const status = data?.newStatus || 'submitted';
  const statusInfo = statusMessages[status] || statusMessages['submitted'];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: ${statusInfo.color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .status-box { background: #f8f9fa; border-left: 4px solid ${statusInfo.color}; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${statusInfo.icon} Issue Status Updated</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>The status of your issue report for <strong>Order #${data?.orderNumber || 'N/A'}</strong> has been updated.</p>
          
          <div class="status-box">
            <p style="margin: 0;"><strong>New Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</p>
            <p style="margin: 10px 0 0 0; color: #666;">${statusInfo.message}</p>
          </div>

          <p>Log in to your customer portal to view full details and any messages from our team.</p>
          
          <a href="${data?.customerPortalLink || '#'}" class="button">View Issue Details</a>
          
          ${status === 'resolved' ? `
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              If you have any further concerns, please don't hesitate to submit a new issue report.
            </p>
          ` : ''}
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Support Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generatePODUploadedEmail(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; }
        .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .order-box { background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📷 Proof of Delivery Available</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Proof of delivery has been uploaded for your <strong>Order #${data?.orderNumber || 'N/A'}</strong>.</p>
          
          <div class="order-box">
            <p><strong>Order:</strong> #${data?.orderNumber || 'N/A'}</p>
            <p><strong>Order ID:</strong> ${data?.orderId || 'N/A'}</p>
          </div>

          <p>You can now view the delivery proof (photo and/or signature) in your order details.</p>
          
          <a href="${data?.customerPortalLink || '#'}" class="button">View Delivery Proof</a>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateAutomatedCustomerNotificationEmail(data: any): string {
  const notificationType = data?.notification_type || 'status_update';
  const customerName = data?.customerName || 'Valued Customer';
  const orderNumber = data?.orderNumber || 'N/A';
  const customerPortalLink = data?.customerPortalLink || 'https://trustlinkcompany.com/portal';
  const supportEmail = data?.supportEmail || 'support@trustlinkcompany.com';
  const attribution = data?.attribution || 'Automated update from Trust Link Ventures';

  // Get notification-specific content
  const content = getNotificationContent(notificationType, data);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #666; border: 1px solid #e0e0e0; border-top: none; }
        .button { display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .order-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #1e3a5f; }
        .notice-box { background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .success-box { background: #d4edda; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #28a745; }
        .attribution { font-size: 12px; color: #888; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${content.headerIcon} ${content.headerTitle}</h1>
        </div>
        <div class="content">
          <p>Dear ${customerName},</p>
          
          ${content.body}
          
          <div class="order-box">
            <p style="margin: 0;"><strong>Order Reference:</strong> #${orderNumber}</p>
          </div>

          <p>View your order details and track updates in your customer portal:</p>
          <a href="${customerPortalLink}" class="button">View Order Details</a>
          
          <p>If you have any questions, please don't hesitate to contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br><strong>Trust Link Ventures Team</strong></p>
          <p class="attribution">${attribution}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getNotificationContent(notificationType: string, data: any): { headerIcon: string; headerTitle: string; body: string } {
  switch (notificationType) {
    case 'payment_reminder':
      return {
        headerIcon: '💳',
        headerTitle: 'Payment Reminder',
        body: `
          <p>This is a friendly reminder that we have not yet received payment for your order.</p>
          <div class="notice-box">
            <p style="margin: 0;"><strong>Action Required:</strong> Please submit your payment at your earliest convenience to avoid any delays in processing your order.</p>
          </div>
          <p>If you have already made the payment, please disregard this notice and allow 1-2 business days for processing.</p>
        `,
      };

    case 'balance_reminder':
      return {
        headerIcon: '💰',
        headerTitle: 'Balance Due Reminder',
        body: `
          <p>We wanted to remind you that there is a remaining balance on your order.</p>
          <div class="notice-box">
            <p style="margin: 0;"><strong>Outstanding Balance:</strong> Please review your order and submit the remaining payment to ensure timely delivery.</p>
          </div>
          <p>You can view the full payment breakdown in your customer portal.</p>
        `,
      };

    case 'status_notification':
      return {
        headerIcon: '📦',
        headerTitle: 'Order Status Update',
        body: `
          <p>There has been an update to your order status.</p>
          <div class="success-box">
            <p style="margin: 0;">${data?.message || 'Your order has been updated. Please check your customer portal for details.'}</p>
          </div>
          <p>We're working hard to ensure your order is processed efficiently.</p>
        `,
      };

    case 'payment_received':
      return {
        headerIcon: '✅',
        headerTitle: 'Payment Received',
        body: `
          <p>Thank you! We have received your payment.</p>
          <div class="success-box">
            <p style="margin: 0;"><strong>Payment Confirmed:</strong> Your payment has been successfully recorded and your order is being processed.</p>
          </div>
          <p>You will receive further updates as your order progresses.</p>
        `,
      };

    case 'delay_notice':
      return {
        headerIcon: '⏰',
        headerTitle: 'Delivery Update',
        body: `
          <p>We wanted to keep you informed about your order delivery.</p>
          <div class="notice-box">
            <p style="margin: 0;">${data?.message || 'There may be a slight delay in your expected delivery date. We apologize for any inconvenience and are working to fulfill your order as quickly as possible.'}</p>
          </div>
          <p>We appreciate your patience and understanding. Please check your customer portal for the latest estimated delivery date.</p>
        `,
      };

    default:
      return {
        headerIcon: '📋',
        headerTitle: 'Order Update',
        body: `
          <p>We have an update regarding your order.</p>
          <p>${data?.message || 'Please check your customer portal for the latest information about your order.'}</p>
        `,
      };
  }
}

serve(handler);