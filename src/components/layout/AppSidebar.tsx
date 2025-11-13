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
  ExternalLink,
  Receipt,
  Ship
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigateToPublicSite } from '@/utils/domainUtils';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { RealtimeIndicator } from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { getStorageUrl } from '@/config/supabase';

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
  { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
  { title: 'Customers', url: '/admin/customers', icon: Users },
  { title: 'Leads', url: '/admin/leads', icon: Target },
  { title: 'Orders', url: '/admin/orders', icon: ShoppingCart },
  { title: 'Quotes', url: '/admin/quotes', icon: FileText },
  { title: 'Invoices', url: '/admin/invoices', icon: Receipt },
  { title: 'Customer Quote Inquiries', url: '/admin/quote-inquiries', icon: MessageSquare },
  { title: 'Communication', url: '/admin/communication', icon: Phone },
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

  const isActive = (path: string) => currentPath === path;
  const isExpanded = state === 'expanded';

  return (
    <Sidebar className={cn(
      "border-r border-border/50 transition-all duration-300 bg-gradient-to-b from-[#F7F9FC] to-[#EEF2F6]",
      isExpanded ? "w-64" : "w-16"
    )} collapsible="icon">
      <SidebarHeader className="border-b border-border/50">
        <div className={cn(
          "flex items-center gap-3 px-4 py-4 rounded-xl bg-gradient-to-r from-[#3B82F6]/10 to-[#0EA5E9]/10",
          !isExpanded && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white p-1 flex-shrink-0 shadow-sm">
            <img 
              src={getStorageUrl('logos', 'trust_link_ventures.png')} 
              alt="Trust Link Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {isExpanded && (
            <div>
              <h2 className="font-semibold text-base bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] bg-clip-text text-transparent">Trust Link</h2>
              <p className="text-xs text-[#64748B]">Ventures</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-2",
            !isExpanded && "sr-only"
          )}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                          "hover:bg-[#EFF6FF] hover:scale-[1.02]",
                          isActive && "bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white font-semibold shadow-md before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-white before:rounded-l-lg",
                          !isActive && "text-[#475569]",
                          !isExpanded && "justify-center"
                        )
                      }
                      end={item.url === '/'}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {isExpanded && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={cn(
            "text-xs uppercase tracking-wider text-[#94A3B8] font-semibold mb-2",
            !isExpanded && "sr-only"
          )}>
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
                          "hover:bg-[#EFF6FF] hover:scale-[1.02]",
                          isActive && "bg-gradient-to-r from-[#3B82F6] to-[#0EA5E9] text-white font-semibold shadow-md before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-white before:rounded-l-lg",
                          !isActive && "text-[#475569]",
                          !isExpanded && "justify-center"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {isExpanded && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Public Site Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Public Site">
                  <button
                    onClick={navigateToPublicSite}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-[#475569] hover:bg-[#EFF6FF] hover:scale-[1.02] w-full",
                      !isExpanded && "justify-center"
                    )}
                  >
                    <ExternalLink className="h-5 w-5 flex-shrink-0" />
                    {isExpanded && <span className="text-sm">View Public Site</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>

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