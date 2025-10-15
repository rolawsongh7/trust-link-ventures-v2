import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Plus, Minus, Trash2, Package, MessageSquare } from 'lucide-react';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';


export const CustomerCart: React.FC = () => {
  const { items, totalItems, updateQuantity, removeItem, clearCart, loading } = useShoppingCart();
  const { user, profile } = useCustomerAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleSubmitQuote = async () => {
    if (!user || !profile) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to submit a quote request.",
      });
      return;
    }

    // Check for required profile fields
    if (!profile.company_name || !profile.full_name) {
      toast({
        variant: "destructive",
        title: "Incomplete Profile",
        description: "Please complete your company name and full name in your profile before submitting a quote request.",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Cart",
        description: "Please add items to your cart before submitting a quote request.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Check if customer record exists
      const { data: existingCustomer, error: customerCheckError } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile.email)
        .maybeSingle();

      if (customerCheckError) throw customerCheckError;

      let customerId = user.id;

      // Step 2: Create customer record if it doesn't exist
      if (!existingCustomer) {
        console.log('Creating customer record for:', profile.email);
        
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            id: user.id,
            email: profile.email,
            company_name: profile.company_name,
            contact_name: profile.full_name,
            phone: profile.phone || null,
            country: profile.country || null,
            industry: profile.industry || 'Food & Beverage',
            customer_status: 'active',
            priority: 'medium',
            notes: 'Customer created automatically via customer portal'
          }])
          .select()
          .single();

        if (customerError) {
          console.error('Error creating customer:', customerError);
          throw new Error('Failed to create customer record. Please try again.');
        }
        
        customerId = newCustomer.id;
        console.log('Customer record created successfully:', customerId);
      } else {
        customerId = existingCustomer.id;
        console.log('Using existing customer record:', customerId);
      }

      // Step 3: Create quote request with verified customer_id
      const { data: quoteRequest, error: quoteError } = await supabase
        .from('quote_requests')
        .insert([
          {
            customer_id: customerId,
            title: `Quote Request from ${profile.company_name}`,
            message: message || `Quote request for ${items.length} product(s)`,
            request_type: 'customer',
            status: 'pending',
            urgency: 'medium',
            lead_company_name: profile.company_name,
            lead_contact_name: profile.full_name,
            lead_email: profile.email,
            lead_phone: profile.phone,
            lead_country: profile.country,
            lead_industry: profile.industry,
          }
        ])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Create quote request items
      const quoteItems = items.map(item => ({
        quote_request_id: quoteRequest.id,
        product_name: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        specifications: item.specifications,
        preferred_grade: item.preferredGrade,
      }));

      const { error: itemsError } = await supabase
        .from('quote_request_items')
        .insert(quoteItems);

      if (itemsError) throw itemsError;

      // Send customer confirmation email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: profile.email,
            subject: `Quote Request Received - ${quoteRequest.quote_number}`,
            type: 'quote-confirmation',
            data: {
              customerName: profile.full_name,
              companyName: profile.company_name,
              contactName: profile.full_name,
              industry: profile.industry || 'Food & Beverage',
              quoteNumber: quoteRequest.quote_number,
              quoteId: quoteRequest.id,
              itemCount: items.length,
              items: items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                specifications: item.specifications,
                preferredGrade: item.preferredGrade
              })),
              message: message || 'No additional notes provided'
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending customer confirmation email:', emailError);
      }

      // Send admin notification email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: 'info@trustlinkcompany.com',
            subject: `New Quote Request from ${profile.company_name} - ${quoteRequest.quote_number}`,
            type: 'new_quote_request_admin',
            data: {
              quoteNumber: quoteRequest.quote_number,
              quoteId: quoteRequest.id,
              customerName: profile.full_name,
              companyName: profile.company_name,
              customerEmail: profile.email,
              customerPhone: profile.phone || 'Not provided',
              country: profile.country || 'Not provided',
              industry: profile.industry || 'Food & Beverage',
              itemCount: items.length,
              items: items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                specifications: item.specifications,
                preferredGrade: item.preferredGrade
              })),
              message: message || 'No additional notes',
              urgency: 'medium',
              dashboardLink: `${window.location.origin}/admin/quote-requests`
            }
          }
        });
      } catch (adminEmailError) {
        console.error('Error sending admin notification email:', adminEmailError);
      }

      // Clear cart and show success
      await clearCart();
      setMessage('');
      
      toast({
        title: "🎉 Quote Request Submitted Successfully!",
        description: "Great! Your quote request has been received and is being processed. We'll send you a detailed quote soon. Your cart has been cleared for your next order.",
      });

    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Failed to submit quote request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6">
                Add products from our catalog to request a quote
              </p>
              <Button asChild>
                <a href="/customer/catalog">Browse Products</a>
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Shopping Cart
          </h1>
          <p className="text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? 's' : ''} ready for quote
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Package className="h-4 w-4 mr-2" />
          {totalItems}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{item.productName}</h3>
                    {item.productDescription && (
                      <p className="text-muted-foreground text-sm mb-3">
                        {item.productDescription}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Unit:</span> {item.unit}
                      </div>
                      {item.preferredGrade && (
                        <div>
                          <span className="font-medium">Grade:</span> {item.preferredGrade}
                        </div>
                      )}
                    </div>
                    {item.specifications && (
                      <div className="mt-2">
                        <span className="font-medium text-sm">Specifications:</span>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.specifications}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Quote Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Additional Notes (Optional)
                </label>
                <Textarea
                  placeholder="Any specific requirements, delivery dates, or questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="pt-4 border-t">
                <Button
                  onClick={handleSubmitQuote}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-primary to-primary/90"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="w-full mt-2"
                >
                  Clear Cart
                </Button>
              </div>
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quote Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Company:</span> {profile.company_name}
                </div>
                <div>
                  <span className="font-medium">Contact:</span> {profile.full_name}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {profile.email}
                </div>
                {profile.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {profile.phone}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};