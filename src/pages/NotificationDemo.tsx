import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { ArrowLeft, Bell, MessageSquare, Package, TrendingUp } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const NotificationDemo = () => {
  const { sendLocalNotification } = usePushNotifications();

  const demoNotifications = [
    {
      title: "Order Confirmed",
      body: "Your order #TLV-2024-001 has been confirmed and is being processed.",
      icon: Package,
      color: "bg-green-500"
    },
    {
      title: "Shipment Update",
      body: "Your shipment is now in transit from our Ghana facility.",
      icon: TrendingUp,
      color: "bg-blue-500"
    },
    {
      title: "Quote Ready",
      body: "Your quote request for premium seafood is ready for review.",
      icon: MessageSquare,
      color: "bg-purple-500"
    },
    {
      title: "Delivery Alert",
      body: "Your cold chain delivery will arrive tomorrow between 9-11 AM.",
      icon: Bell,
      color: "bg-orange-500"
    }
  ];

  const handleDemoNotification = async (notification: typeof demoNotifications[0]) => {
    await sendLocalNotification(notification.title, notification.body);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-poppins font-bold">Push Notifications</h1>
            <p className="text-muted-foreground">
              Configure and test push notifications for your mobile experience
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <div className="space-y-6">
            <NotificationSettings />
          </div>

          {/* Demo Notifications */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Demo Notifications
                </CardTitle>
                <CardDescription>
                  Try different types of notifications you'll receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {demoNotifications.map((notification, index) => {
                  const IconComponent = notification.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${notification.color}`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.body}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDemoNotification(notification)}
                      >
                        Send
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mobile App Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                    <Package className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Real-time Order Tracking</p>
                    <p className="text-muted-foreground text-xs">
                      Get instant updates on your shipment status
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                    <Bell className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Smart Notifications</p>
                    <p className="text-muted-foreground text-xs">
                      Never miss important updates about your business
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-primary/10 rounded-full mt-0.5">
                    <TrendingUp className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Market Insights</p>
                    <p className="text-muted-foreground text-xs">
                      Receive timely market updates and pricing alerts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Install as Mobile App</CardTitle>
            <CardDescription>
              For the best push notification experience, install this app on your mobile device
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">On iOS (iPhone/iPad):</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open this website in Safari</li>
                <li>Tap the Share button</li>
                <li>Tap "Add to Home Screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
            <div>
              <h4 className="font-medium mb-2">On Android:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Open this website in Chrome</li>
                <li>Tap the menu (3 dots)</li>
                <li>Tap "Add to Home screen"</li>
                <li>Tap "Add" to confirm</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotificationDemo;