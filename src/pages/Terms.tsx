import React from 'react';
import SEO from '@/components/SEO';
import { PAGE_SEO } from '@/config/seo.config';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={PAGE_SEO.terms.title}
        description={PAGE_SEO.terms.description}
        keywords={PAGE_SEO.terms.keywords}
        canonical="https://trustlinkcompany.com/terms"
      />
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
                5. Order Cancellation Policy
              </h2>
              <div className="text-foreground space-y-2">
                <p>Customers may cancel orders under the following conditions:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Orders can be cancelled before "Processing Started" status</li>
                  <li>Cancellation requests must be submitted via email to info@trustlinkventures.com</li>
                  <li>Orders in "Processing" or "Shipped" status cannot be cancelled</li>
                  <li>Cancellation timeframe: Within 24 hours of order placement for full refund</li>
                  <li>Partially processed orders are subject to a 15% restocking fee</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                6. Refund & Returns Policy
              </h2>
              <div className="text-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Damaged goods:</strong> Full refund if reported within 48 hours of delivery with photo evidence</li>
                  <li><strong>Incorrect items:</strong> Replacement or full refund at customer's choice</li>
                  <li><strong>Quality issues:</strong> Inspection required, refund issued within 7-10 business days</li>
                  <li><strong>Refund method:</strong> Original payment method (bank transfer reversal for manual payments)</li>
                  <li><strong>Non-refundable:</strong> Orders refused at delivery without valid reason</li>
                  <li><strong>Temperature-sensitive goods:</strong> No refunds for spoilage due to customer delay in accepting delivery</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                7. Payment Terms
              </h2>
              <div className="text-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Payment methods:</strong> Paystack (card, mobile money, bank transfer) or manual bank transfer</li>
                  <li><strong>Payment verification:</strong> 1-2 business days for manual transfers</li>
                  <li><strong>Payment proof required:</strong> Upload receipt/confirmation via Orders page</li>
                  <li><strong>Failed payment:</strong> Order automatically cancelled after 48 hours</li>
                  <li><strong>Pricing:</strong> All prices exclusive of delivery fees (added at checkout)</li>
                  <li><strong>Currency:</strong> GHS default, multi-currency quotes available on request</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                8. Delivery & Failed Delivery
              </h2>
              <div className="text-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Delivery timeframe:</strong> 3-7 business days from payment confirmation</li>
                  <li><strong>Failed delivery:</strong> Customer contacted for redelivery within 24 hours</li>
                  <li><strong>Redelivery fees:</strong> First redelivery free, subsequent attempts charged</li>
                  <li><strong>Maximum redelivery attempts:</strong> 2</li>
                  <li><strong>Refused delivery:</strong> Non-refundable, customer liable for return shipping</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                9. Dispute Resolution
              </h2>
              <div className="text-foreground space-y-2">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Customer support:</strong> info@trustlinkventures.com, response within 24-48 hours</li>
                  <li><strong>Escalation:</strong> Dispute resolution via email within 7 business days</li>
                  <li><strong>Mediation:</strong> Ghana Arbitration Centre for unresolved B2B disputes</li>
                  <li><strong>Jurisdiction:</strong> Courts of Ghana</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                10. Force Majeure
              </h2>
              <div className="text-foreground space-y-2">
                <p>Trust Link Ventures is not liable for delays or failures due to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Weather conditions, customs delays, civil unrest, natural disasters</li>
                  <li>Customer notification: Email updates for significant delays</li>
                  <li>Compensation: Delivery fee waiver for delays exceeding 14 days (no refund on goods)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                11. Changes to Terms
              </h2>
              <p className="text-foreground">
                Trust Link Ventures may update these terms at any time. Continued use of the site implies acceptance of any revisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                12. Governing Law
              </h2>
              <p className="text-foreground">
                These terms are governed by the laws of the Republic of Ghana.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-poppins font-semibold text-foreground mb-3">
                13. Contact
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