import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Building2, DollarSign, Calendar, Briefcase } from 'lucide-react';

interface Lead {
  id: string;
  contact_name: string;
  email: string;
  phone: string;
  company_name: string;
  status: string;
  lead_score: number;
  source: string | null;
  notes: string | null;
  created_at: string;
}

interface LeadConversionProps {
  lead: Lead;
  onConversionComplete: () => void;
}

const LeadConversion: React.FC<LeadConversionProps> = ({ lead, onConversionComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversionData, setConversionData] = useState({
    orderValue: '',
    industry: '',
    priority: 'medium',
    notes: `Converted from lead: ${lead.contact_name}`,
    expectedCloseDate: ''
  });
  const { toast } = useToast();

  const handleConversion = async () => {
    setLoading(true);

    try {
      // 1. Create customer from lead data
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([{
          company_name: lead.company_name,
          contact_name: lead.contact_name,
          email: lead.email,
          phone: lead.phone,
          customer_status: 'active',
          priority: conversionData.priority,
          industry: conversionData.industry || null,
          annual_revenue: conversionData.orderValue ? Number(conversionData.orderValue) : null,
          notes: conversionData.notes
        }])
        .select()
        .single();

      if (customerError) throw customerError;

      // 2. Update the lead status to converted
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          status: 'closed_won'
        })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // 3. Create conversion activity
      await supabase
        .from('activities')
        .insert([{
          customer_id: customer.id,
          activity_type: 'conversion',
          subject: `Lead converted to customer`,
          description: `Lead "${lead.contact_name}" from "${lead.company_name}" successfully converted to active customer.\n\nConversion Details:\n- Order Value: ${conversionData.orderValue ? `$${Number(conversionData.orderValue).toLocaleString()}` : 'Not specified'}\n- Industry: ${conversionData.industry || 'Not specified'}\n- Priority: ${conversionData.priority}\n- Notes: ${conversionData.notes}`,
          status: 'completed'
        }]);

      // 4. Create an opportunity if order value is specified
      if (conversionData.orderValue) {
        await supabase
          .from('opportunities')
          .insert([{
            customer_id: customer.id,
            name: `Sales Opportunity - ${lead.company_name}`,
            description: `Opportunity created from converted lead: ${lead.contact_name}`,
            value: Number(conversionData.orderValue),
            stage: 'qualification',
            probability: 70,
            expected_close_date: conversionData.expectedCloseDate || null,
            source: 'lead_conversion'
          }]);
      }

      toast({
        title: "Success",
        description: "Lead successfully converted to customer!",
      });
      setIsOpen(false);
      onConversionComplete();

    } catch (error) {
      console.error('Error converting lead:', error);
      toast({
        title: "Error",
        description: "Failed to convert lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (lead.status === 'closed_won') {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        <UserCheck className="h-3 w-3 mr-1" />
        Converted
      </Badge>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <UserCheck className="h-4 w-4" />
          Convert to Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Convert Lead to Customer
          </DialogTitle>
          <DialogDescription>
            Convert "{lead.contact_name}" to an active customer. This will create a customer record and update the lead status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lead Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Company:</span>
                <span>{lead.company_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact:</span>
                <span>{lead.contact_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{lead.email || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span className="capitalize">{lead.source?.replace('_', ' ') || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Score:</span>
                <span>{lead.lead_score || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderValue" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Expected Order Value
                </Label>
                <Input
                  id="orderValue"
                  type="number"
                  placeholder="Expected order value"
                  value={conversionData.orderValue}
                  onChange={(e) => setConversionData({...conversionData, orderValue: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedCloseDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expected Close Date
                </Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={conversionData.expectedCloseDate}
                  onChange={(e) => setConversionData({...conversionData, expectedCloseDate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Industry
                </Label>
                <Input
                  id="industry"
                  placeholder="e.g., Food & Beverage"
                  value={conversionData.industry}
                  onChange={(e) => setConversionData({...conversionData, industry: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Customer Priority</Label>
                <Select
                  value={conversionData.priority}
                  onValueChange={(value) => setConversionData({...conversionData, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Conversion Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the conversion..."
                value={conversionData.notes}
                onChange={(e) => setConversionData({...conversionData, notes: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConversion}
              disabled={loading}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              {loading ? 'Converting...' : 'Convert Lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadConversion;