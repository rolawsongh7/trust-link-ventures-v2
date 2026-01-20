import { useState, useEffect, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { registerDevice, unregisterAllDevices, updateDeviceActivity } from '@/lib/deviceRegistration';

interface NotificationHook {
  isSupported: boolean;
  token: string | null;
  isRegistered: boolean;
  requestPermissions: () => Promise<void>;
  registerForNotifications: () => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: Record<string, any>) => Promise<void>;
  unregisterDevice: () => Promise<void>;
}

export const usePushNotifications = (): NotificationHook => {
  const [isSupported, setIsSupported] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(Capacitor.isNativePlatform());
    
    if (Capacitor.isNativePlatform()) {
      initializePushNotifications();
    }

    // Update device activity periodically
    const activityInterval = setInterval(() => {
      updateDeviceActivity();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(activityInterval);
    };
  }, []);

  const initializePushNotifications = async () => {
    // Add listeners for push notification events
    await addListeners();
  };

  const navigateToDeepLink = useCallback((link: string | undefined) => {
    if (!link) return;
    
    // Handle deep link navigation
    // Use window.location for simplicity - works across platforms
    if (link.startsWith('/')) {
      window.location.href = link;
    } else if (link.startsWith('http')) {
      window.location.href = link;
    }
  }, []);

  const addListeners = async () => {
    // Listen for registration success
    await PushNotifications.addListener('registration', async (tokenData: Token) => {
      console.log('Push registration success, token: ', tokenData.value);
      setToken(tokenData.value);

      // Register device in database
      const result = await registerDevice(tokenData.value);
      if (result.success) {
        setIsRegistered(true);
        toast({
          title: "Notifications Enabled",
          description: "You'll receive important updates from Trust Link Ventures.",
        });
      } else {
        console.error('Failed to register device in database:', result.error);
      }
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

    // Listen for push notifications received (foreground)
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received: ', JSON.stringify(notification));
        
        // Show a local notification when app is in foreground
        if (notification.title && notification.body) {
          sendLocalNotification(
            notification.title, 
            notification.body,
            notification.data
          );
        }
      }
    );

    // Listen for push notification actions (when user taps notification)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed: ', JSON.stringify(action));
        
        // Get deep link from notification data
        const link = action.notification.data?.link as string | undefined;
        
        if (link) {
          // Navigate to the deep link
          navigateToDeepLink(link);
        } else {
          // Fallback toast
          toast({
            title: action.notification.title || "Notification",
            description: action.notification.body || "New notification received",
          });
        }
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

  const sendLocalNotification = async (
    title: string, 
    body: string, 
    data?: Record<string, any>
  ) => {
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
              extra: data || null
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  const unregisterDevice = async () => {
    try {
      await unregisterAllDevices();
      setToken(null);
      setIsRegistered(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  };

  return {
    isSupported,
    token,
    isRegistered,
    requestPermissions,
    registerForNotifications,
    sendLocalNotification,
    unregisterDevice,
  };
};
