import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, CheckCircle } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Badge } from '@/components/ui/badge';

export const NotificationSettings = () => {
  const { 
    isSupported, 
    token, 
    requestPermissions, 
    sendLocalNotification 
  } = usePushNotifications();

  const handleTestNotification = async () => {
    await sendLocalNotification(
      'Test Notification',
      'This is a test notification from Trust Link Ventures!'
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className="p-3 bg-primary/10 rounded-full">
            <Bell className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          Push Notifications
          {isSupported ? (
            <Badge variant="secondary" className="text-xs">
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Web Only
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Stay updated with important information about your orders and shipments
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
          <div className="flex items-center gap-2">
            {token ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Notifications Enabled</span>
              </>
            ) : (
              <>
                <BellOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Not Configured</span>
              </>
            )}
          </div>
          {token && (
            <Badge variant="outline" className="text-xs">
              Active
            </Badge>
          )}
        </div>

        {/* Enable Notifications */}
        {!token && (
          <div className="space-y-3">
            <Button 
              onClick={requestPermissions}
              className="w-full"
              disabled={!isSupported}
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
            
            {!isSupported && (
              <p className="text-xs text-muted-foreground text-center">
                Push notifications are available on mobile devices. 
                Install this app on your phone for the full experience.
              </p>
            )}
          </div>
        )}

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="order-updates" className="text-sm">
                Order Updates
              </Label>
              <Switch id="order-updates" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="shipment-tracking" className="text-sm">
                Shipment Tracking
              </Label>
              <Switch id="shipment-tracking" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="quote-responses" className="text-sm">
                Quote Responses
              </Label>
              <Switch id="quote-responses" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="promotional" className="text-sm">
                Promotional Offers
              </Label>
              <Switch id="promotional" />
            </div>
          </div>
        </div>

        {/* Test Notification */}
        {token && (
          <div className="pt-3 border-t">
            <Button 
              onClick={handleTestNotification}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Send Test Notification
            </Button>
          </div>
        )}

        {/* Device Token (for debugging) */}
        {token && (
          <div className="pt-3 border-t">
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground mb-2">
                Device Token (for developers)
              </summary>
              <code className="block p-2 bg-muted rounded text-xs break-all">
                {token}
              </code>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};