import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Copy, Building2, Smartphone, AlertCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderPaymentInstructionsProps {
  orderNumber: string;
  quoteNumber?: string;
  totalAmount: number;
  currency: string;
  emailSent?: boolean;
}

export const OrderPaymentInstructions: React.FC<OrderPaymentInstructionsProps> = ({
  orderNumber,
  quoteNumber,
  totalAmount,
  currency,
  emailSent = false
}) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: "Copied!",
      description: `${fieldName} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const paymentReference = quoteNumber || orderNumber;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">Payment Instructions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Complete your payment to process your order
            </p>
          </div>
          {emailSent && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Sent to Email
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Important Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-semibold text-amber-900">Important Payment Notes:</h4>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li><strong>Always include the payment reference</strong> in your transaction</li>
                <li>Payment must be received within <strong>7 days</strong></li>
                <li>Upload proof of payment after completing the transaction</li>
                <li>Processing begins after payment verification</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Payment Reference */}
        <div className="bg-primary/5 border-2 border-primary/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">PAYMENT REFERENCE (Required)</p>
              <p className="text-2xl font-bold text-primary font-mono">{paymentReference}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(paymentReference, 'Payment Reference')}
            >
              {copiedField === 'Payment Reference' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold">
            {totalAmount.toLocaleString()} {currency}
          </p>
        </div>

        {/* Payment Options */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Choose Your Payment Method:</h3>

          {/* Bank Transfer */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-blue-900">
                <Building2 className="h-5 w-5" />
                Option 1: Bank Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Bank Name</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono">Ecobank Ghana</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('Ecobank Ghana', 'Bank Name')}
                    >
                      {copiedField === 'Bank Name' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Account Name</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono text-sm">Trust Link Ventures Limited</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('Trust Link Ventures Limited', 'Account Name')}
                    >
                      {copiedField === 'Account Name' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Account Number (GHS)</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono text-lg font-bold">1641001593405</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('1641001593405', 'Account Number')}
                    >
                      {copiedField === 'Account Number' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Swift Code</p>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono">ECOCGHAC</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('ECOCGHAC', 'Swift Code')}
                    >
                      {copiedField === 'Swift Code' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Money */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                <Smartphone className="h-5 w-5" />
                Option 2: Mobile Money
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-yellow-400 rounded flex items-center justify-center text-xs font-bold">MTN</div>
                    <p className="text-sm font-medium text-green-900">MTN Mobile Money</p>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono font-bold">0244690607</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('0244690607', 'MTN Number')}
                    >
                      {copiedField === 'MTN Number' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-xs font-bold text-white">VOD</div>
                    <p className="text-sm font-medium text-green-900">Vodafone Cash</p>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono font-bold">0506690607</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('0506690607', 'Vodafone Number')}
                    >
                      {copiedField === 'Vodafone Number' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">AT</div>
                    <p className="text-sm font-medium text-green-900">AirtelTigo Money</p>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded">
                    <p className="font-mono font-bold">0276690607</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('0276690607', 'AirtelTigo Number')}
                    >
                      {copiedField === 'AirtelTigo Number' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <p className="text-sm text-green-800 mt-2">
                <strong>Account Name:</strong> Trust Link Ventures Limited
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Next Steps */}
        <div className="bg-muted rounded-lg p-4">
          <h4 className="font-semibold mb-2">Next Steps:</h4>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Make payment using one of the methods above</li>
            <li><strong>Include the payment reference: {paymentReference}</strong></li>
            <li>Upload your payment proof/receipt below</li>
            <li>Wait for payment verification (usually within 24 hours)</li>
            <li>Order processing will begin once payment is verified</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};
