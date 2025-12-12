import React from 'react';
import SEO from '@/components/SEO';
import { PAGE_SEO } from '@/config/seo.config';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={PAGE_SEO.privacy.title}
        description={PAGE_SEO.privacy.description}
        keywords={PAGE_SEO.privacy.keywords}
        canonical="https://trustlinkcompany.com/privacy"
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-poppins font-bold text-foreground mb-8">
            Privacy Policy
          </h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Effective Date:</strong> November 22, 2025
          </p>
          
          <p className="text-foreground mb-6">
            Trust Link Ventures Ltd. ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or interact with our services.
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                1. Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Personal Information:</strong> Name, email, phone number, country, and company details submitted via contact forms.</li>
                <li><strong>Automated Information:</strong> IP address, browser type, pages visited, and time spent via cookies and analytics tools.</li>
                <li>
                  <strong>Mobile App Permissions:</strong>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Camera and Photo Library:</strong> Used exclusively to capture and upload proof of payment documents (invoices, receipts, bank transfer confirmations). Photos are encrypted and stored securely. We never access your photo library without explicit permission.</li>
                    <li><strong>Location Data:</strong> Collected only when you provide or update delivery addresses for order fulfillment. Location data is used solely to ensure accurate delivery and is never shared with third parties for advertising purposes.</li>
                    <li><strong>Push Notifications:</strong> Used to send order updates, delivery notifications, and important account alerts. You can disable these at any time in your device settings.</li>
                  </ul>
                </li>
                <li><strong>Payment Proof Documents:</strong> Images of payment receipts, bank transfers, and invoices uploaded through the mobile app for order verification purposes.</li>
                <li><strong>Delivery Information:</strong> Street addresses, postal codes, city, and country data provided for order shipment and logistics coordination.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                2. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>To respond to inquiries and fulfill service requests.</li>
                <li>To improve website functionality and customer experience.</li>
                <li>To send updates, newsletters, or promotional offers (only with consent).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                3. Mobile App Permissions
              </h2>
              <p className="text-foreground mb-3">
                Our mobile application may request the following device permissions to provide full functionality:
              </p>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Camera & Photo Library Access</h3>
                  <p className="text-foreground">
                    <strong>Purpose:</strong> To enable you to upload proof of payment for orders (bank transfer receipts, payment confirmations, invoices).
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Data Usage:</strong> Photos are uploaded directly to our secure servers, encrypted in transit and at rest. We only access photos you explicitly select for upload. We do not scan, analyze, or access other photos in your library.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Retention:</strong> Payment proof images are retained for accounting and audit purposes for up to 7 years in compliance with financial record-keeping regulations.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Control:</strong> You can revoke camera/photo access at any time through your device Settings → Privacy → Photos/Camera → Trust Link Ventures.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Location Services</h3>
                  <p className="text-foreground">
                    <strong>Purpose:</strong> To auto-fill delivery addresses and ensure accurate shipping for your frozen food orders.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Data Usage:</strong> Location data is used only when you add or update a delivery address. We do not track your real-time location or create location history. Precise location is optional; you can manually enter addresses instead.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Sharing:</strong> Location data is shared only with our logistics partners for delivery purposes and is never sold to advertisers.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Control:</strong> You can deny location access or change settings at any time through your device Settings → Privacy → Location Services → Trust Link Ventures.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-2">Push Notifications</h3>
                  <p className="text-foreground">
                    <strong>Purpose:</strong> To send timely updates about your orders (shipment confirmations, delivery updates, payment reminders, account security alerts).
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Data Usage:</strong> Your device token is stored to send notifications. We do not use push notifications for advertising or promotional content without your consent.
                  </p>
                  <p className="text-foreground mt-2">
                    <strong>Control:</strong> Disable push notifications at any time through your device Settings → Notifications → Trust Link Ventures.
                  </p>
                </div>
              </div>

              <p className="text-foreground mt-4">
                <strong>Permission Requests:</strong> We will always explain why we need a permission before requesting it. All permissions are optional, though some app features may be limited without them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                4. Sharing of Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>We do not sell, trade, or rent your personal data.</li>
                <li>Data may be shared with CRM or analytics platforms solely for service improvement.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                5. Data Security
              </h2>
              <p className="text-foreground mb-3">
                We use industry-standard security protocols to protect your data from unauthorized access.
              </p>
              <p className="text-foreground mt-2">
                <strong>Mobile App Security:</strong> All data transmitted between the mobile app and our servers is encrypted using TLS 1.3. Payment proof images are scanned for malware and stored in encrypted cloud storage with strict access controls. Multi-factor authentication (MFA) is available to protect your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                6. Your Rights
              </h2>
              <p className="text-foreground">
                You may request access, correction, or deletion of your personal information by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                7. Contact Us
              </h2>
              <p className="text-foreground">
                For privacy concerns, email us at:{' '}
                <a href="mailto:privacy@trustlinkventures.com" className="text-primary hover:underline">
                  privacy@trustlinkventures.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;