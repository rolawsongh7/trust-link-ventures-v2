import React from 'react';
import { Check, Calendar, DollarSign, Smartphone, Globe, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const PricingProposal = () => {
  return (
    <div className="max-w-5xl mx-auto p-8 bg-background">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Customer Portal Platform
        </h1>
        <p className="text-xl text-muted-foreground mb-2">
          Custom Development & Implementation Proposal
        </p>
        <p className="text-sm text-muted-foreground">
          Prepared for: [Client Company Name] | Date: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Executive Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            This proposal outlines the development and implementation of a comprehensive Customer Portal Platform 
            that will streamline your order management, quote processing, and customer communication workflows. 
            The solution includes web application, native mobile apps (iOS & Android), and ongoing technical support.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-semibold">Web Application</p>
                <p className="text-sm text-muted-foreground">Responsive & PWA-enabled</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Smartphone className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-semibold">Native Mobile Apps</p>
                <p className="text-sm text-muted-foreground">iOS & Android</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-primary mt-1" />
              <div>
                <p className="font-semibold">Enterprise Security</p>
                <p className="text-sm text-muted-foreground">Bank-level encryption</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Overview */}
      <Card className="mb-8 border-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-2xl flex items-center">
            <DollarSign className="h-6 w-6 mr-2" />
            Investment Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">One-Time Setup</p>
              <p className="text-4xl font-bold text-foreground">$50,000 - $95,000</p>
              <p className="text-sm text-muted-foreground">Complete implementation & deployment</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Monthly Maintenance</p>
              <p className="text-4xl font-bold text-foreground">$2,800 - $5,500</p>
              <p className="text-sm text-muted-foreground">Ongoing support & infrastructure</p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="space-y-3">
            <h4 className="font-semibold text-lg">Additional Annual Costs (Paid Directly):</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex justify-between">
                <span>• Apple Developer Program</span>
                <span className="font-semibold">$99/year</span>
              </li>
              <li className="flex justify-between">
                <span>• Google Play Console</span>
                <span className="font-semibold">$25 one-time</span>
              </li>
              <li className="flex justify-between">
                <span>• Custom Domain</span>
                <span className="font-semibold">$10-20/year</span>
              </li>
              <li className="flex justify-between">
                <span>• Payment Processing Fees</span>
                <span className="font-semibold">2.9% + $0.30 per transaction</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">What's Included</CardTitle>
          <CardDescription>Comprehensive solution with everything you need</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Zap className="h-4 w-4 mr-2 text-primary" />
                Core Platform
              </h4>
              <ul className="space-y-2">
                {[
                  'Custom-branded web application',
                  'Admin dashboard & CRM',
                  'Customer portal',
                  'Quote & order management',
                  'Payment processing integration',
                  'Real-time notifications',
                  'Document generation (PDFs)',
                  'Email automation system'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Smartphone className="h-4 w-4 mr-2 text-primary" />
                Mobile Apps
              </h4>
              <ul className="space-y-2">
                {[
                  'Native iOS app (App Store)',
                  'Native Android app (Play Store)',
                  'Push notifications',
                  'Offline capabilities',
                  'Biometric authentication',
                  'Camera integration',
                  'App store optimization',
                  'App store submission & approval'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Shield className="h-4 w-4 mr-2 text-primary" />
                Setup & Configuration
              </h4>
              <ul className="space-y-2">
                {[
                  'Brand customization (logo, colors, domain)',
                  'Business workflow configuration',
                  'Data migration & initial setup',
                  'User training (2-4 sessions)',
                  'Payment gateway integration',
                  'Email service configuration',
                  'Comprehensive testing & QA',
                  'Security audit & hardening'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
                Ongoing Maintenance
              </h4>
              <ul className="space-y-2">
                {[
                  'Infrastructure hosting & monitoring',
                  'Technical support (24hr response)',
                  'Security updates & patches',
                  'Performance optimization',
                  'Monthly backup verification',
                  'Bug fixes (non-feature)',
                  'App store compliance monitoring',
                  'Up to 5 hours monthly changes'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-4 w-4 text-primary mr-2 mt-1 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            Project Timeline
          </CardTitle>
          <CardDescription>Estimated 6-12 weeks from contract signing to launch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { phase: 'Week 1-2', title: 'Discovery & Setup', desc: 'Requirements finalization, branding, and initial configuration' },
              { phase: 'Week 3-5', title: 'Core Development', desc: 'Web platform customization and workflow implementation' },
              { phase: 'Week 6-8', title: 'Mobile Development', desc: 'iOS & Android app development and testing' },
              { phase: 'Week 9-10', title: 'Integration & Testing', desc: 'Payment gateway, email service, and comprehensive QA' },
              { phase: 'Week 11', title: 'Training & Documentation', desc: 'User training sessions and documentation delivery' },
              { phase: 'Week 12', title: 'Launch & App Store Submission', desc: 'Go-live and app store deployment' }
            ].map((milestone, idx) => (
              <div key={idx} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/30">
                <Badge variant="outline" className="mt-1">{milestone.phase}</Badge>
                <div>
                  <p className="font-semibold">{milestone.title}</p>
                  <p className="text-sm text-muted-foreground">{milestone.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optional Add-ons */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Optional Enhancements</CardTitle>
          <CardDescription>Additional features available upon request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="font-semibold mb-1">Custom Feature Development</p>
              <p className="text-sm text-muted-foreground mb-2">Additional features beyond core scope</p>
              <p className="text-lg font-bold text-primary">$7,000 - $20,000 per feature</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold mb-1">App Store Optimization (ASO)</p>
              <p className="text-sm text-muted-foreground mb-2">Maximize app visibility and downloads</p>
              <p className="text-lg font-bold text-primary">$1,500 - $3,000 one-time</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold mb-1">Priority Support Upgrade</p>
              <p className="text-sm text-muted-foreground mb-2">4-hour response time guarantee</p>
              <p className="text-lg font-bold text-primary">+$500/month</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="font-semibold mb-1">Additional Development Hours</p>
              <p className="text-sm text-muted-foreground mb-2">For custom modifications and features</p>
              <p className="text-lg font-bold text-primary">$150 - $200/hour</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">Payment Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
            <span className="font-semibold">Contract Signing</span>
            <span className="text-lg font-bold">40% Deposit</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
            <span className="font-semibold">Midpoint (Week 6)</span>
            <span className="text-lg font-bold">30% Progress Payment</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded">
            <span className="font-semibold">Launch Completion</span>
            <span className="text-lg font-bold">30% Final Payment</span>
          </div>
          <Separator className="my-4" />
          <p className="text-sm text-muted-foreground">
            Monthly maintenance fees begin 30 days after launch. Invoiced monthly with Net 15 payment terms.
          </p>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="mb-8 border-primary">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-xl">Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ol className="space-y-3">
            <li className="flex items-start">
              <span className="font-bold text-primary mr-3">1.</span>
              <span className="text-muted-foreground">Review this proposal and prepare any questions</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary mr-3">2.</span>
              <span className="text-muted-foreground">Schedule a discovery call to discuss specific requirements</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary mr-3">3.</span>
              <span className="text-muted-foreground">Finalize scope, timeline, and pricing based on your needs</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold text-primary mr-3">4.</span>
              <span className="text-muted-foreground">Sign contract and begin development</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground space-y-2">
        <p>This proposal is valid for 30 days from the date above.</p>
        <p>Questions? Contact us at [your-email@company.com] | [your-phone-number]</p>
        <p className="pt-4 border-t">© 2025 [Your Company Name]. All rights reserved.</p>
      </div>
    </div>
  );
};

export default PricingProposal;