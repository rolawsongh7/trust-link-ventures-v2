import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Target,
  ShoppingCart,
  FileText,
  MessageSquare,
  Phone,
  Calculator,
  Settings,
  Bell,
  Clock,
  Bot,
  Receipt,
  Ship
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { RealtimeIndicator } from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { getStorageUrl } from '@/config/supabase';
import { useNavigationCounts } from '@/hooks/useNavigationCounts';
import { SidebarBadge } from '@/components/layout/SidebarBadge';
import { SystemStatus } from '@/components/layout/SystemStatus';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3, badge: 'analytics' as const },
  { title: 'Customers', url: '/admin/customers', icon: Users, badge: null },
  { title: 'Leads', url: '/admin/leads', icon: Target, badge: 'leads' as const },
  { title: 'Orders', url: '/admin/orders', icon: ShoppingCart, badge: 'orders' as const },
  { title: 'Quotes', url: '/admin/quotes', icon: FileText, badge: 'quotes' as const },
  { title: 'Invoices', url: '/admin/invoices', icon: Receipt, badge: null },
  { title: 'Customer Quote Requests', url: '/admin/quote-inquiries', icon: MessageSquare, badge: 'quoteInquiries' as const },
  { title: 'Communication', url: '/admin/communication', icon: Phone, badge: 'communications' as const },
];


const systemItems = [
  { title: 'Virtual Assistant', url: '/admin/virtual-assistant', icon: Bot },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { isSyncing } = useBackgroundSync();
  const { data: counts } = useNavigationCounts();

  const isActive = (path: string) => currentPath === path;
  const isExpanded = state === 'expanded';

  const getBadgeCount = (badgeKey: 'orders' | 'quotes' | 'leads' | 'communications' | 'quoteInquiries' | 'analytics' | null) => {
    if (!badgeKey || !counts) return 0;
    return counts[badgeKey] || 0;
  };

  return (
    <Sidebar className={cn(
      "border-r border-slate-700/50 transition-all duration-300",
      "bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A]",
      isExpanded ? "w-64" : "w-16"
    )} collapsible="icon">
      <SidebarHeader className="border-b border-slate-700/50 p-4">
        <div className={cn(
          "flex items-center gap-3 rounded-xl",
          "bg-gradient-to-r from-[#0EA5E9]/10 via-[#3B82F6]/10 to-[#0EA5E9]/10",
          "p-3 relative overflow-hidden",
          !isExpanded && "justify-center"
        )}>
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
          
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white p-1.5 flex-shrink-0 shadow-lg ring-2 ring-blue-500/20 relative z-10">
            <img 
              src={getStorageUrl('logos', 'trust_link_ventures.png')} 
              alt="Trust Link Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {isExpanded && (
            <div className="relative z-10">
              <h2 className="font-bold text-base bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Trust Link
              </h2>
              <p className="text-xs text-slate-400 font-medium">Admin Portal</p>
            </div>
          )}
        </div>
        
        {/* System Status */}
        {isExpanded && (
          <div className="mt-3">
            <SystemStatus isExpanded={isExpanded} isSyncing={isSyncing} />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 px-3",
            !isExpanded && "sr-only"
          )}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item, index) => {
                const badgeCount = getBadgeCount(item.badge);
                return (
                  <SidebarMenuItem key={item.title} style={{ animationDelay: `${index * 50}ms` }} className="animate-in fade-in slide-in-from-left-2">
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative group",
                            "hover:bg-slate-800/60 hover:scale-[1.02] hover:shadow-lg",
                            isActive && [
                              "bg-gradient-to-r from-[#0EA5E9]/20 to-[#3B82F6]/10",
                              "border-l-4 border-l-[#0EA5E9]",
                              "text-white font-semibold",
                              "shadow-[0_0_20px_rgba(14,165,233,0.25)]",
                              "scale-[1.01]",
                            ],
                            !isActive && "text-slate-100 border-l-4 border-l-transparent",
                            !isExpanded && "justify-center"
                          )
                        }
                        end={item.url === '/admin/analytics'}
                      >
                        <div className="relative">
                          <item.icon className={cn(
                            "h-6 w-6 flex-shrink-0 transition-colors duration-200",
                            "group-hover:text-[#0EA5E9]"
                          )} />
                          {badgeCount > 0 && !isExpanded && (
                            <SidebarBadge count={badgeCount} />
                          )}
                        </div>
                        {isExpanded && (
                          <>
                            <span className="text-sm flex-1">{item.title}</span>
                            {badgeCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-semibold shadow-lg">
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* System Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wider text-slate-400 font-bold mb-2 px-3",
            !isExpanded && "sr-only"
          )}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 relative group",
                          "hover:bg-slate-800/60 hover:scale-[1.02] hover:shadow-lg",
                          isActive && [
                            "bg-gradient-to-r from-[#0EA5E9]/20 to-[#3B82F6]/10",
                            "border-l-4 border-l-[#0EA5E9]",
                            "text-white font-semibold",
                            "shadow-[0_0_20px_rgba(14,165,233,0.25)]",
                            "scale-[1.01]",
                          ],
                          !isActive && "text-slate-100 border-l-4 border-l-transparent",
                          !isExpanded && "justify-center"
                        )
                      }
                    >
                      <item.icon className={cn(
                        "h-6 w-6 flex-shrink-0 transition-colors duration-200",
                        "group-hover:text-[#0EA5E9]"
                      )} />
                      {isExpanded && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Notifications */}
              <SidebarMenuItem>
                <div className={`${isExpanded ? 'px-3 py-2' : 'px-2 py-2 flex justify-center'}`}>
                  <NotificationCenter />
                </div>
              </SidebarMenuItem>

              {/* Live Indicator */}
              <SidebarMenuItem>
                <div className={`${isExpanded ? 'px-3 py-2' : 'px-2 py-2 flex justify-center'}`}>
                  <RealtimeIndicator isSyncing={isSyncing} />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}