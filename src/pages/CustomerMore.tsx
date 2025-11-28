import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  MapPin, 
  MessageSquare, 
  User, 
  BarChart3, 
  Bell, 
  Settings,
  ChevronRight,
  Receipt,
  MoreHorizontal,
  Grid3X3,
  HelpCircle
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Badge } from '@/components/ui/badge';
import { PortalPageHeader } from '@/components/customer/PortalPageHeader';

export const CustomerMore: React.FC = () => {
  const { profile } = useCustomerAuth();
  const { unreadCount } = useRealtimeNotifications();

  const menuSections = [
    {
      title: 'Orders & Quotes',
      items: [
        {
          title: 'Quotes',
          description: 'View and manage your quotes',
          href: '/portal/quotes',
          icon: FileText,
          iconColor: 'text-blue-500'
        },
        {
          title: 'Invoices',
          description: 'View your invoices and payment history',
          href: '/portal/invoices',
          icon: Receipt,
          iconColor: 'text-green-500'
        }
      ]
    },
    {
      title: 'Account Settings',
      items: [
        {
          title: 'Delivery Addresses',
          description: 'Manage your delivery locations',
          href: '/portal/addresses',
          icon: MapPin,
          iconColor: 'text-red-500'
        },
        {
          title: 'Messages',
          description: 'View communications and updates',
          href: '/portal/communications',
          icon: MessageSquare,
          iconColor: 'text-purple-500'
        },
        {
          title: 'Profile',
          description: 'Update your account information',
          href: '/portal/profile',
          icon: User,
          iconColor: 'text-indigo-500'
        }
      ]
    },
    {
      title: 'Insights & Preferences',
      items: [
        {
          title: 'Analytics',
          description: 'View your order statistics',
          href: '/portal/analytics',
          icon: BarChart3,
          iconColor: 'text-orange-500'
        },
        {
          title: 'Notifications',
          description: 'Manage notification preferences',
          href: '/portal/notifications',
          icon: Bell,
          iconColor: 'text-yellow-500',
          badge: unreadCount > 0 ? unreadCount : undefined
        },
        {
          title: 'Settings',
          description: 'Account and app preferences',
          href: '/portal/settings',
          icon: Settings,
          iconColor: 'text-gray-500'
        }
      ]
    },
    {
      title: 'Support',
      items: [
        {
          title: 'Help & FAQs',
          description: 'Get answers to common questions',
          href: '/portal/help',
          icon: HelpCircle,
          iconColor: 'text-cyan-500'
        }
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 space-y-6">
      {/* Header */}
      <Card className="overflow-hidden">
        <PortalPageHeader
          title="More"
          subtitle="Additional features and settings"
          totalCount={menuSections.reduce((acc, section) => acc + section.items.length, 0)}
          totalIcon={MoreHorizontal}
          patternId="more-grid"
          stats={[
            {
              label: "Sections",
              count: menuSections.length,
              icon: Grid3X3
            }
          ]}
        />
      </Card>

      {/* Menu Sections */}
      <div className="space-y-6">
        {menuSections.map((section) => (
          <Card key={section.title} className="bg-background border-border">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors touch-manipulation min-h-[60px]"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center ${item.iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-medium text-foreground">
                              {item.title}
                            </h3>
                            {item.badge && (
                              <Badge 
                                className="bg-destructive text-destructive-foreground px-2 py-0.5 text-xs font-semibold"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User Info Footer */}
      <Card className="bg-muted/30 border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
              {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {profile?.full_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.company_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
