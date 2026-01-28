import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomerNotifications } from '@/hooks/useCustomerNotifications';
import { Bell, CheckCircle, Info, AlertCircle, XCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function CustomerNotifications() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useCustomerNotifications();
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
      case 'balance_payment_request':
        return <AlertCircle className="h-5 w-5 text-[#F4B400]" />;
      default:
        return <Info className="h-5 w-5 text-[#0077B6]" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200';
      case 'warning':
      case 'balance_payment_request':
        return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200';
      default:
        return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200';
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#0EA5E9] border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white">Notifications</CardTitle>
          </CardHeader>
        </Card>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Premium Gradient Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#0EA5E9] p-8 shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20px 20px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Notifications</h1>
            <p className="text-blue-100 text-lg">Stay updated on your orders and quotes</p>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-[#F4B400] text-white px-4 py-2 text-lg font-bold">
              {unreadCount} New
            </Badge>
          )}
        </div>
      </div>

      {/* Mark all as read button */}
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="border-[#0077B6] text-[#0077B6] hover:bg-[#0077B6] hover:text-white transition-all"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      )}

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="bg-white/90 backdrop-blur-md border border-white/20 shadow-lg">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No notifications yet</h3>
            <p className="text-gray-500">You'll see updates about your orders and quotes here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unread Notifications */}
          {unreadNotifications.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#003366] flex items-center gap-2">
                <div className="h-2 w-2 bg-[#F4B400] rounded-full animate-pulse"></div>
                Unread ({unreadNotifications.length})
              </h2>
              {unreadNotifications.map(notification => (
                <Card
                  key={notification.id}
                  className={`${getNotificationStyle(notification.type)} border-2 shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-[#1E293B] mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-[#475569] mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#64748B]">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Read Notifications */}
          {readNotifications.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-[#64748B]">
                Earlier
              </h2>
              {readNotifications.map(notification => (
                <Card
                  key={notification.id}
                  className="bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1 opacity-60">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-[#475569] mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-[#64748B] mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
