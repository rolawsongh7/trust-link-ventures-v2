import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, FileText, Download, Eye, Trash2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const CompliancePrivacy: React.FC = () => {
  const [privacySettings, setPrivacySettings] = useState({
    dataEncryption: true,
    auditLogging: true,
    anonymization: true,
    rightToErasure: true,
    dataPortability: true,
    consentManagement: true,
    cookieConsent: true,
    thirdPartyTracking: false
  });

  const [dataRetentionPeriod, setDataRetentionPeriod] = useState('36');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const { toast } = useToast();

  const complianceStandards = [
    { name: 'GDPR', status: 'compliant', description: 'General Data Protection Regulation' },
    { name: 'SOC 2', status: 'compliant', description: 'System and Organization Controls' },
    { name: 'ISO 27001', status: 'in-progress', description: 'Information Security Management' },
    { name: 'HIPAA', status: 'not-applicable', description: 'Health Insurance Portability' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-500">Compliant</Badge>;
      case 'in-progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'not-applicable':
        return <Badge variant="outline">N/A</Badge>;
      default:
        return <Badge variant="destructive">Non-Compliant</Badge>;
    }
  };

  const exportUserData = () => {
    toast({
      title: "Data Export Initiated",
      description: "User data export will be available for download shortly"
    });
  };

  const deleteUserData = () => {
    toast({
      title: "Data Deletion Request",
      description: "User data deletion request has been processed",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Compliance Standards
          </CardTitle>
          <CardDescription>
            Monitor compliance with various data protection and security standards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {complianceStandards.map((standard) => (
            <div key={standard.name} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{standard.name}</div>
                <div className="text-sm text-muted-foreground">{standard.description}</div>
              </div>
              {getStatusBadge(standard.status)}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Controls
          </CardTitle>
          <CardDescription>
            Configure data protection and privacy settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(privacySettings).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => 
                    setPrivacySettings(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention-period">Data Retention Period (months)</Label>
            <div className="flex items-center gap-2">
              <input
                id="retention-period"
                type="range"
                min="12"
                max="84"
                step="12"
                value={dataRetentionPeriod}
                onChange={(e) => setDataRetentionPeriod(e.target.value)}
                className="flex-1"
              />
              <Badge variant="outline">{dataRetentionPeriod} months</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Subject Rights
          </CardTitle>
          <CardDescription>
            Tools for managing individual privacy rights under GDPR
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={exportUserData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export User Data
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Data Usage
            </Button>
            
            <Button variant="destructive" onClick={deleteUserData} className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Delete User Data
            </Button>
            
            <Button variant="outline" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              All data subject requests are logged and processed within 30 days as required by GDPR.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Policy Management</CardTitle>
          <CardDescription>
            Update and manage your privacy policy and terms of service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="privacy-policy">Privacy Policy</Label>
            <Textarea
              id="privacy-policy"
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              placeholder="Enter your privacy policy text..."
              rows={6}
            />
          </div>
          
          <div className="flex gap-2">
            <Button>Save Policy</Button>
            <Button variant="outline">Preview</Button>
            <Button variant="outline">Download PDF</Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Last updated: December 15, 2024 • Version 2.1
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>
            Recent compliance and privacy-related activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Data export request processed</p>
                <p className="text-sm text-muted-foreground">User ID: user123 • Type: GDPR Export</p>
              </div>
              <span className="text-sm text-muted-foreground">2 hours ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Privacy policy updated</p>
                <p className="text-sm text-muted-foreground">Version 2.1 published</p>
              </div>
              <span className="text-sm text-muted-foreground">1 day ago</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Data retention policy applied</p>
                <p className="text-sm text-muted-foreground">Removed 150 records older than 36 months</p>
              </div>
              <span className="text-sm text-muted-foreground">3 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};