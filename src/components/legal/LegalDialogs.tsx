import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalDialogProps {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const LegalDialog = ({ trigger, title, children }: LegalDialogProps) => (
  <Dialog>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent className="max-w-4xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh] pr-4">
        {children}
      </ScrollArea>
    </DialogContent>
  </Dialog>
);

export const TermsDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <LegalDialog trigger={trigger} title="Terms of Service">
    <div className="space-y-6 text-sm">
      <p className="text-muted-foreground">Effective Date: January 1, 2025</p>
      
      <section>
        <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
        <p>Welcome to the website of Trust Link Ventures Ltd. By accessing or using our website, you agree to the following terms:</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">2. Use of Website</h3>
        <p>You may use our website for lawful purposes only. You agree not to use the site in any way that could damage, disable, or impair our services.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">3. Intellectual Property</h3>
        <p>All content, including logos, images, and text, are the intellectual property of Trust Link Ventures Ltd. Unauthorized use is prohibited.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">4. User Conduct</h3>
        <p>Users must not engage in activities that violate laws or infringe on the rights of others while using our website.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">5. Disclaimer of Warranties</h3>
        <p>Our website is provided "as is" without warranties of any kind, either express or implied.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">6. Limitation of Liability</h3>
        <p>Trust Link Ventures Ltd. shall not be liable for any indirect, incidental, or consequential damages arising from the use of our website.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">7. Changes to Terms</h3>
        <p>Trust Link Ventures may update these terms at any time. Continued use of the site implies acceptance of any revisions.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">8. Governing Law</h3>
        <p>These terms are governed by the laws of Ghana and any disputes will be resolved in Ghanaian courts.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">9. Contact Information</h3>
        <p>For questions about these terms, contact us at: <a href="mailto:info@trustlinkventures.com" className="text-primary hover:underline">info@trustlinkventures.com</a></p>
      </section>
    </div>
  </LegalDialog>
);

export const PrivacyDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <LegalDialog trigger={trigger} title="Privacy Policy">
    <div className="space-y-6 text-sm">
      <p className="text-muted-foreground">Effective Date: January 1, 2025</p>
      
      <section>
        <h3 className="font-semibold mb-2">1. Introduction</h3>
        <p>Trust Link Company Ltd. ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or interact with our services.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">2. Information We Collect</h3>
        <p>We may collect personal information such as your name, email address, phone number, and company details when you contact us or request our services.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">3. How We Use Your Information</h3>
        <p>We use your information to respond to inquiries, provide services, improve our website, and communicate with you about our services.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">4. Information Sharing</h3>
        <p>We do not sell, trade, or rent your personal information to third parties without your consent, except as required by law.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">5. Data Security</h3>
        <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">6. Your Rights</h3>
        <p>You have the right to access, update, or delete your personal information. Contact us to exercise these rights.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">7. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">8. Contact Us</h3>
        <p>If you have questions about this Privacy Policy, please contact us at: <a href="mailto:info@trustlinkcompany.com" className="text-primary hover:underline">info@trustlinkcompany.com</a></p>
      </section>
    </div>
  </LegalDialog>
);

export const CookiesDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <LegalDialog trigger={trigger} title="Cookie Policy">
    <div className="space-y-6 text-sm">
      <p className="text-muted-foreground">Effective Date: January 1, 2025</p>
      
      <section>
        <h3 className="font-semibold mb-2">1. What Are Cookies</h3>
        <p>This Cookie Policy explains how Trust Link Ventures Ltd. uses cookies and similar technologies when you visit our website.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">2. How We Use Cookies</h3>
        <p>We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. Cookies help us understand how you interact with our website.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">3. Types of Cookies We Use</h3>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>Essential Cookies:</strong> Necessary for the website to function properly</li>
          <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
          <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">4. Managing Cookies</h3>
        <p>You can control cookies through your browser settings. However, disabling cookies may affect the functionality of our website.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">5. Third-Party Cookies</h3>
        <p>We may use third-party services that set cookies on our website. These cookies are governed by the respective third parties' privacy policies.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">6. Updates to Cookie Policy</h3>
        <p>We may update this Cookie Policy from time to time. Please review this page periodically for any changes.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">7. Contact Us</h3>
        <p>If you have questions about our use of cookies, please contact us at: <a href="mailto:info@trustlinkventures.com" className="text-primary hover:underline">info@trustlinkventures.com</a></p>
      </section>
    </div>
  </LegalDialog>
);