import { useState, useEffect } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

interface NotificationHook {
  isSupported: boolean;
  token: string | null;
  requestPermissions: () => Promise<void>;
  registerForNotifications: () => Promise<void>;
  sendLocalNotification: (title: string, body: string) => Promise<void>;
}

export const usePushNotifications = (): NotificationHook => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }
  }, []);

  const initializePushNotifications = async () => {
    // Add listeners for push notification events
    await addListeners();
  };

  const addListeners = async () => {
    // Listen for registration success
    await PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token: ', token.value);
      setToken(token.value);
      toast({
        title: "Notifications Enabled",
        description: "You'll receive important updates from Trust Link Ventures.",
      });
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ', JSON.stringify(error));
      toast({
        title: "Notification Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    });

    // Listen for push notifications received
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received: ', JSON.stringify(notification));
        
        // Show a local notification when app is in foreground
        if (notification.title && notification.body) {
          sendLocalNotification(notification.title, notification.body);
        }
      }
    );

    // Listen for push notification actions (when user taps notification)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push notification action performed: ', JSON.stringify(notification));
        
        // Handle notification tap - could navigate to specific page
        toast({
          title: notification.notification.title || "Notification",
          description: notification.notification.body || "New notification received",
        });
      }
    );
  };

  const requestPermissions = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Not Supported",
        description: "Push notifications are only available on mobile devices.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        await registerForNotifications();
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your device settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      toast({
        title: "Permission Error",
        description: "Failed to request notification permissions.",
        variant: "destructive",
      });
    }
  };

  const registerForNotifications = async () => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await PushNotifications.register();
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      toast({
        title: "Registration Error",
        description: "Failed to register for notifications.",
        variant: "destructive",
      });
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web - show toast
      toast({
        title,
        description: body,
      });
      return;
    }

    try {
      // Request permissions for local notifications
      const permissions = await LocalNotifications.requestPermissions();
      
      if (permissions.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
              sound: 'beep.wav',
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  return {
    isSupported,
    token,
    requestPermissions,
    registerForNotifications,
    sendLocalNotification,
  };
};