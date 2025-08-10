import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { EmailService } from '@/services/emailService';
import { Mail, Send, Eye } from 'lucide-react';

export const EmailTemplatePreview: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [testEmail, setTestEmail] = useState('');
  const [testData, setTestData] = useState({
    name: 'John Doe',
    resetLink: 'https://example.com/reset-password',
    verificationLink: 'https://example.com/verify-email',
    companyName: 'Acme Corp',
    quoteId: 'QR123456'
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const emailTemplates = [
    { id: 'welcome', name: 'Welcome Email', description: 'Sent when users sign up' },
    { id: 'password-reset', name: 'Password Reset', description: 'Password reset instructions' },
    { id: 'verification', name: 'Email Verification', description: 'Email verification link' },
    { id: 'quote-confirmation', name: 'Quote Confirmation', description: 'Quote request confirmation' },
    { id: 'security-alert', name: 'Security Alert', description: 'Security notifications' }
  ];

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      let success = false;
      
      switch (selectedTemplate) {
        case 'welcome':
          success = await EmailService.sendWelcomeEmail(testEmail, testData.name);
          break;
        case 'password-reset':
          success = await EmailService.sendPasswordResetEmail(testEmail, testData.resetLink, testData.name);
          break;
        case 'verification':
          success = await EmailService.sendVerificationEmail(testEmail, testData.verificationLink, testData.name);
          break;
        case 'quote-confirmation':
          success = await EmailService.sendQuoteConfirmation(testEmail, {
            quoteId: testData.quoteId,
            customerName: testData.name,
            companyName: testData.companyName
          });
          break;
        case 'security-alert':
          success = await EmailService.sendLoginAlert(testEmail, 'San Francisco, CA', '192.168.1.1', 'Chrome on Windows');
          break;
      }

      if (success) {
        toast({
          title: "Test Email Sent",
          description: `${emailTemplates.find(t => t.id === selectedTemplate)?.name} test email sent successfully!`
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTemplatePreview = () => {
    switch (selectedTemplate) {
      case 'welcome':
        return (
          <div className="prose max-w-none">
            <h2>Welcome to SeaPro SAS!</h2>
            <p>Dear {testData.name},</p>
            <p>Welcome to SeaPro SAS! We're excited to have you as part of our global community.</p>
            <p>Our platform offers premium meat and seafood products with global sourcing and distribution.</p>
          </div>
        );
      case 'password-reset':
        return (
          <div className="prose max-w-none">
            <h2>Password Reset Request</h2>
            <p>Dear {testData.name},</p>
            <p>We received a request to reset your password for your SeaPro SAS account.</p>
            <div className="bg-red-100 p-4 rounded">
              <strong>Security Notice:</strong> This link will expire in 1 hour.
            </div>
          </div>
        );
      case 'verification':
        return (
          <div className="prose max-w-none">
            <h2>Verify Your Email</h2>
            <p>Dear {testData.name},</p>
            <p>Please verify your email address to complete your account setup.</p>
            <p>This verification link will expire in 24 hours.</p>
          </div>
        );
      case 'quote-confirmation':
        return (
          <div className="prose max-w-none">
            <h2>Quote Request Confirmed</h2>
            <p>Dear {testData.name},</p>
            <p>Thank you for your quote request. We have received your inquiry and our team will review it shortly.</p>
            <div className="bg-gray-100 p-4 rounded">
              <strong>Quote ID:</strong> #{testData.quoteId}<br/>
              <strong>Company:</strong> {testData.companyName}
            </div>
          </div>
        );
      case 'security-alert':
        return (
          <div className="prose max-w-none">
            <h2>🔒 Security Alert</h2>
            <p>We detected unusual activity on your account:</p>
            <div className="bg-yellow-100 p-4 rounded">
              <strong>Login from new device</strong><br/>
              Location: San Francisco, CA<br/>
              Device: Chrome on Windows
            </div>
          </div>
        );
      default:
        return <p>Select a template to preview</p>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Manager
          </CardTitle>
          <CardDescription>
            Preview and test email templates used throughout the application
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selection & Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Template Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Email Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Test Data</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={testData.name}
                    onChange={(e) => setTestData(prev => ({...prev, name: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input
                    value={testData.companyName}
                    onChange={(e) => setTestData(prev => ({...prev, companyName: e.target.value}))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Quote ID</Label>
                  <Input
                    value={testData.quoteId}
                    onChange={(e) => setTestData(prev => ({...prev, quoteId: e.target.value}))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Send Test Email</h4>
              <div className="space-y-2">
                <Label>Test Email Address</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <Button onClick={sendTestEmail} disabled={isLoading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {isLoading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Template Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Template Preview
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {emailTemplates.find(t => t.id === selectedTemplate)?.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-6 bg-white min-h-96">
              {getTemplatePreview()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Usage Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {emailTemplates.map((template) => (
              <div key={template.id} className="text-center space-y-2">
                <div className="text-2xl font-bold text-primary">
                  {Math.floor(Math.random() * 100)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {template.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  This month
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};