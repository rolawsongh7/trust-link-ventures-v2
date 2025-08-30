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
  customer_id?: string;
  title?: string;
  description?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  value?: number;
  currency?: string;
  probability?: number;
  expected_close_date?: string;
  assigned_to?: string;
  source?: string;
  lead_score?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface LeadConversionProps {
  lead: Lead;
  onConversionComplete: () => void;
}

const LeadConversion: React.FC<LeadConversionProps> = ({ lead, onConversionComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversionData, setConversionData] = useState({
    orderValue: lead.value?.toString() || '',
    expectedCloseDate: lead.expected_close_date || ''
  });
  const { toast } = useToast();

  const handleConversion = async () => {
    setLoading(true);

    try {
      // 1. Get existing customer or create one if not linked
      let customerId = lead.customer_id;
      
      if (!customerId) {
        // If lead is not linked to a customer, we need customer info
        toast({
          title: "Error",
          description: "Lead must be linked to a customer before conversion",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Update lead status to closed_won
      const { error: leadError } = await supabase
        .from('leads')
        .update({ status: 'closed_won' })
        .eq('id', lead.id);

      if (leadError) throw leadError;

      // 3. Create opportunity record
      const { error: opportunityError } = await supabase
        .from('opportunities')
        .insert([
          {
            name: `Opportunity from ${lead.title || 'Lead'}`,
            customer_id: customerId,
            stage: 'qualification',
            value: parseFloat(conversionData.orderValue) || lead.value || 0,
            probability: 75,
            expected_close_date: conversionData.expectedCloseDate || lead.expected_close_date || null,
            description: `Converted from lead ${lead.id}`,
            source: lead.source
          }
        ]);

      if (opportunityError) throw opportunityError;

      toast({
        title: "Success",
        description: "Lead successfully converted to opportunity!",
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
          Convert to Opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Convert Lead to Opportunity
          </DialogTitle>
          <DialogDescription>
            Convert this lead to an opportunity in the sales pipeline.
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
                <span className="text-muted-foreground">Title:</span>
                <span>{lead.title || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span>{lead.description || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Value:</span>
                <span>{lead.value ? `${lead.currency || 'USD'} ${lead.value}` : '-'}</span>
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
                  Opportunity Value
                </Label>
                <Input
                  id="orderValue"
                  type="number"
                  placeholder="Expected value"
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