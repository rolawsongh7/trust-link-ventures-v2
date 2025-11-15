import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface InlineCustomerFormProps {
  onCustomerCreated: (customerId: string, customerData: any) => void;
  onCancel: () => void;
}

const INDUSTRIES = [
  'Food & Beverage',
  'Manufacturing',
  'Distribution',
  'Retail',
  'Hospitality',
  'Healthcare',
  'Agriculture',
  'Other'
];

const COUNTRIES = [
  'Ghana',
  'Nigeria',
  'Kenya',
  'South Africa',
  'United Kingdom',
  'United States',
  'Other'
];

export const InlineCustomerForm: React.FC<InlineCustomerFormProps> = ({
  onCustomerCreated,
  onCancel
}) => {
  const form = useForm({
    defaultValues: {
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      industry: 'Food & Beverage',
      country: 'Ghana',
      city: '',
      address: ''
    }
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          company_name: data.company_name,
          contact_name: data.contact_name,
          email: data.email,
          phone: data.phone,
          industry: data.industry,
          country: data.country,
          city: data.city,
          address: data.address,
          customer_status: 'prospect',
          priority: 'medium'
        })
        .select()
        .single();

      if (error) throw error;

      onCustomerCreated(newCustomer.id, newCustomer);
    } catch (error) {
      console.error('Error creating customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Add New Customer</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="company_name"
              rules={{ required: 'Company name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Premier Products Ltd" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              rules={{ required: 'Contact name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Kwame Buabeng" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="email"
              rules={{ 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="kwame@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              rules={{ required: 'Phone is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone *</FormLabel>
                  <FormControl>
                    <Input placeholder="+233 24 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INDUSTRIES.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="Accra" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Select Customer
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
