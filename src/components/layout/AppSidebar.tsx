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
  ExternalLink
} from 'lucide-react';
import { navigateToPublicSite } from '@/utils/domainUtils';

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

  const isActive = (path: string) => currentPath === path;
  const isExpanded = state === 'expanded';

  return (
    <Sidebar className={isExpanded ? 'w-64' : 'w-16'} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-primary/10 p-1 flex-shrink-0">
            <img 
              src="/lovable-uploads/22e4a71a-b0c3-4abd-8f53-268d55d324df.png" 
              alt="Trust Link Logo" 
              className="w-full h-full object-contain bg-white rounded-md"
            />
          </div>
          {isExpanded && (
            <div className="font-semibold text-sidebar-foreground">
              <div className="text-sm font-bold">Trust Link Ventures</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={isExpanded ? 'block' : 'sr-only'}>
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-accent-foreground'
                        }`
                      }
                      end={item.url === '/'}
                    >
                      <item.icon className="h-4 w-4" />
                      {isExpanded && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isExpanded ? 'block' : 'sr-only'}>
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
                        `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-accent-foreground'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {isExpanded && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Public Site Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Public Site">
                  <button
                    onClick={navigateToPublicSite}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-sidebar-accent/50 text-sidebar-foreground hover:text-sidebar-accent-foreground w-full"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {isExpanded && <span>View Public Site</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}