import React from 'react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-poppins font-bold text-foreground mb-8">
            Privacy Policy
          </h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Effective Date:</strong> August 5, 2025
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
                3. Sharing of Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li>We do not sell, trade, or rent your personal data.</li>
                <li>Data may be shared with CRM or analytics platforms solely for service improvement.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                4. Data Security
              </h2>
              <p className="text-foreground">
                We use industry-standard security protocols to protect your data from unauthorized access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                5. Your Rights
              </h2>
              <p className="text-foreground">
                You may request access, correction, or deletion of your personal information by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                6. Contact Us
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