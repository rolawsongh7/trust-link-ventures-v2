import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, Building, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CustomerInfo {
  type: 'existing' | 'lead';
  customerId?: string;
  leadCompanyName?: string;
  leadContactName?: string;
  leadEmail?: string;
  leadPhone?: string;
  leadCountry?: string;
  leadIndustry?: string;
}

interface Customer {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  country?: string;
  industry?: string;
}

interface CustomerIdentificationFormProps {
  onSubmit: (customerInfo: CustomerInfo) => void;
  onCancel?: () => void;
}

export const CustomerIdentificationForm: React.FC<CustomerIdentificationFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // New customer form
  const [leadInfo, setLeadInfo] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    country: '',
    industry: '',
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(customer =>
        customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, email, phone, country, industry')
        .order('company_name');

      if (error) throw error;
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExistingCustomerSubmit = () => {
    if (!selectedCustomer) {
      toast({
        title: "Selection Required",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      type: 'existing',
      customerId: selectedCustomer,
    });
  };

  const handleNewCustomerSubmit = () => {
    if (!leadInfo.companyName || !leadInfo.contactName || !leadInfo.email) {
      toast({
        title: "Required Fields",
        description: "Company name, contact name, and email are required",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      type: 'lead',
      leadCompanyName: leadInfo.companyName,
      leadContactName: leadInfo.contactName,
      leadEmail: leadInfo.email,
      leadPhone: leadInfo.phone,
      leadCountry: leadInfo.country,
      leadIndustry: leadInfo.industry,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Customer Information
        </CardTitle>
        <CardDescription>
          Select an existing customer or provide new customer details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Existing Customer
            </TabsTrigger>
            <TabsTrigger value="new" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              New Customer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="search">Search Customers</Label>
              <Input
                id="search"
                placeholder="Search by company name, contact, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading customers...</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {searchTerm ? 'No customers match your search' : 'No customers found'}
                  </p>
                ) : (
                  filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCustomer === customer.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCustomer(customer.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{customer.company_name}</h4>
                          <p className="text-sm text-muted-foreground">{customer.contact_name}</p>
                          <p className="text-sm text-muted-foreground">{customer.email}</p>
                          <div className="flex gap-2 mt-2">
                            {customer.country && (
                              <Badge variant="secondary" className="text-xs">
                                {customer.country}
                              </Badge>
                            )}
                            {customer.industry && (
                              <Badge variant="outline" className="text-xs">
                                {customer.industry}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {selectedCustomer === customer.id && (
                          <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleExistingCustomerSubmit} disabled={!selectedCustomer} className="flex-1">
                Continue with Selected Customer
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={leadInfo.companyName}
                  onChange={(e) => setLeadInfo(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Company name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={leadInfo.contactName}
                  onChange={(e) => setLeadInfo(prev => ({ ...prev, contactName: e.target.value }))}
                  placeholder="Contact person name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={leadInfo.email}
                  onChange={(e) => setLeadInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={leadInfo.phone}
                  onChange={(e) => setLeadInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={leadInfo.country}
                  onChange={(e) => setLeadInfo(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Country"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select 
                  value={leadInfo.industry} 
                  onValueChange={(value) => setLeadInfo(prev => ({ ...prev, industry: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurants">Restaurants</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="food_processing">Food Processing</SelectItem>
                    <SelectItem value="import_export">Import/Export</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleNewCustomerSubmit} 
                disabled={!leadInfo.companyName || !leadInfo.contactName || !leadInfo.email}
                className="flex-1"
              >
                Continue as New Customer
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};