import React from 'react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-poppins font-bold text-foreground mb-8">
            Terms of Service
          </h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Effective Date:</strong> August 5, 2025
          </p>
          
          <p className="text-foreground mb-6">
            Welcome to the website of Trust Link Ventures Ltd. By accessing or using our website, you agree to the following terms:
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                1. Website Use
              </h2>
              <p className="text-foreground">
                This website is for informational and inquiry purposes only. All inquiries are non-binding until formal agreement is reached offline.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                2. Intellectual Property
              </h2>
              <p className="text-foreground">
                All content, including logos, images, and text, are the intellectual property of Trust Link Ventures Ltd. Unauthorized use is prohibited.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                3. User Conduct
              </h2>
              <p className="text-foreground">
                Users agree not to misuse the website, including attempting to hack, spam, or damage any services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                4. Liability Disclaimer
              </h2>
              <p className="text-foreground">
                We are not liable for any inaccuracies or damages resulting from website use. Product availability and pricing are subject to formal quotation and agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                5. Changes to Terms
              </h2>
              <p className="text-foreground">
                Trust Link Ventures may update these terms at any time. Continued use of the site implies acceptance of any revisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                6. Governing Law
              </h2>
              <p className="text-foreground">
                These terms are governed by the laws of the Republic of Ghana.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                7. Contact
              </h2>
              <p className="text-foreground">
                For any legal inquiries, email us at:{' '}
                <a href="mailto:info@trustlinkventures.com" className="text-primary hover:underline">
                  info@trustlinkventures.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;