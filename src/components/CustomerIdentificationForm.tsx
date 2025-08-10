import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, UserPlus } from 'lucide-react';

export interface CustomerInfo {
  type: 'existing' | 'lead';
  customerId?: string;
  // Lead information
  leadCompanyName?: string;
  leadContactName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadCountry?: string;
  leadIndustry?: string;
}

interface CustomerIdentificationFormProps {
  onSubmit: (customerInfo: CustomerInfo) => void;
  onCancel: () => void;
}

export const CustomerIdentificationForm: React.FC<CustomerIdentificationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'lead'>('lead');
  
  // Existing customer form
  const [customerId, setCustomerId] = useState('');
  
  // Lead form
  const [leadCompanyName, setLeadCompanyName] = useState('');
  const [leadContactName, setLeadContactName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCountry, setLeadCountry] = useState('');
  const [leadIndustry, setLeadIndustry] = useState('');

  const handleExistingCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId.trim()) return;
    
    onSubmit({
      type: 'existing',
      customerId: customerId.trim(),
    });
  };

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadCompanyName.trim() || !leadContactName.trim() || !leadEmail.trim()) return;
    
    onSubmit({
      type: 'lead',
      leadCompanyName: leadCompanyName.trim(),
      leadContactName: leadContactName.trim(),
      leadEmail: leadEmail.trim(),
      leadPhone: leadPhone.trim(),
      leadCountry: leadCountry.trim(),
      leadIndustry: leadIndustry.trim(),
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Customer Information</CardTitle>
        <CardDescription>
          Please identify yourself to proceed with the quote request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'lead')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Existing Customer
            </TabsTrigger>
            <TabsTrigger value="lead" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              New Customer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-6">
            <form onSubmit={handleExistingCustomerSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer ID or Email</Label>
                <Input
                  id="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter your customer ID or registered email"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to link your quote request to your existing account
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={!customerId.trim()}>
                  Continue as Existing Customer
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="lead" className="mt-6">
            <form onSubmit={handleLeadSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadCompanyName">Company Name *</Label>
                  <Input
                    id="leadCompanyName"
                    value={leadCompanyName}
                    onChange={(e) => setLeadCompanyName(e.target.value)}
                    placeholder="Your company name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadContactName">Contact Name *</Label>
                  <Input
                    id="leadContactName"
                    value={leadContactName}
                    onChange={(e) => setLeadContactName(e.target.value)}
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadEmail">Email Address *</Label>
                  <Input
                    id="leadEmail"
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="your.email@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadPhone">Phone Number</Label>
                  <Input
                    id="leadPhone"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="leadCountry">Country</Label>
                  <Select value={leadCountry} onValueChange={setLeadCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="GH">Ghana</SelectItem>
                      <SelectItem value="NG">Nigeria</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="NL">Netherlands</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="SG">Singapore</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leadIndustry">Industry</Label>
                  <Select value={leadIndustry} onValueChange={setLeadIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food-retail">Food Retail</SelectItem>
                      <SelectItem value="food-service">Food Service</SelectItem>
                      <SelectItem value="hospitality">Hospitality</SelectItem>
                      <SelectItem value="manufacturing">Food Manufacturing</SelectItem>
                      <SelectItem value="distribution">Distribution</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                      <SelectItem value="import-export">Import/Export</SelectItem>
                      <SelectItem value="catering">Catering</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={!leadCompanyName.trim() || !leadContactName.trim() || !leadEmail.trim()}
                >
                  Continue as New Customer
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
