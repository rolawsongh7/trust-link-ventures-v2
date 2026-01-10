import React from 'react';

const Cookies = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-3xl font-poppins font-bold text-foreground mb-8">
            Cookie Policy
          </h1>
          
          <p className="text-muted-foreground mb-6">
            <strong>Effective Date:</strong> August 5, 2025
          </p>
          
          <p className="text-foreground mb-6">
            This Cookie Policy explains how Trust Link Ventures Ltd. uses cookies and similar technologies when you visit our website.
          </p>

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                1. What Are Cookies?
              </h2>
              <p className="text-foreground">
                Cookies are small data files stored on your device to enhance your experience and enable functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                2. Types of Cookies We Use
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-foreground">
                <li><strong>Essential Cookies:</strong> Required for basic site functions.</li>
                <li><strong>Analytics Cookies:</strong> Help us analyze how users interact with the site.</li>
                <li><strong>Preference Cookies:</strong> Remember your preferences and settings.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                3. How to Control Cookies
              </h2>
              <p className="text-foreground">
                You can set your browser to refuse or alert you about cookies. However, some site features may not function properly without them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                4. Updates to This Policy
              </h2>
              <p className="text-foreground">
                We may revise this Cookie Policy periodically. Updates will be posted here with a new effective date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                5. Contact
              </h2>
              <p className="text-foreground">
                For questions about this policy, email:{' '}
                <a href="mailto:info@truslinkcompany.com" className="text-primary hover:underline">
                  info@truslinkcompany.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cookies;