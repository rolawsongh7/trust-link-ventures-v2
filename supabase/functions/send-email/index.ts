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
  type: 'welcome' | 'password-reset' | 'security-alert' | 'quote-confirmation' | 'verification';
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    let html = '';
    let from = "Trust Link Ventures <noreply@trustlinkventureslimited.com>";

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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Quote Request Confirmed</h1>
        </div>
        <div class="content">
          <p>Dear ${data?.customerName || 'Valued Customer'},</p>
          <p>Thank you for your quote request. We have received your inquiry and our team will review it shortly.</p>
          <div class="quote-details">
            <h3>Quote Details:</h3>
            <p><strong>Request ID:</strong> #${data?.quoteId || 'QR' + Date.now()}</p>
            <p><strong>Company:</strong> ${data?.companyName || 'N/A'}</p>
            <p><strong>Contact:</strong> ${data?.contactName || 'N/A'}</p>
            <p><strong>Industry:</strong> ${data?.industry || 'N/A'}</p>
          </div>
          <p>Our team will contact you within 24-48 hours with a detailed quote and partnership proposal.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Trust Link Ventures</p>
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

serve(handler);