import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InteractiveCard } from '@/components/ui/interactive-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { SupabaseHealthCheck } from '@/components/utils/SupabaseHealthCheck';
import { JMarrManualUpdater } from '@/components/admin/JMarrManualUpdater';
import { LinkOrphanedQuotes } from '@/components/admin/LinkOrphanedQuotes';
import { MultiFactorAuth } from '@/components/security/MultiFactorAuth';
import { AuditLogViewer } from '@/components/security/AuditLogViewer';
import { SecurityMonitoring } from '@/components/security/SecurityMonitoring';
import { NetworkSecurity } from '@/components/security/NetworkSecurity';
import { AnomalyDetection } from '@/components/security/AnomalyDetection';
import { AdminSecurityDashboard } from '@/components/admin/AdminSecurityDashboard';
import { IPWhitelistManagement } from '@/components/admin/IPWhitelistManagement';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { NotificationPreferencesTab } from '@/components/settings/NotificationPreferencesTab';
import { UserManagementTab } from '@/components/settings/UserManagementTab';
import { Settings as SettingsIcon, Database, Bell, Users, Shield, FileText, Network, Activity, ShieldAlert, Link2, Crown, Menu } from 'lucide-react';
import { useRoleAuth } from '@/hooks/useRoleAuth';

const Settings = () => {
  const { hasAdminAccess, loading: roleLoading } = useRoleAuth();
  const [activeTab, setActiveTab] = useState(hasAdminAccess ? "admin-security" : "system-status");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Tab configuration
  const adminTabs = [
    { value: "admin-security", label: "Admin Security", icon: <ShieldAlert className="h-4 w-4" /> },
    { value: "quote-linking", label: "Quote Linking", icon: <Link2 className="h-4 w-4" /> },
  ];

  const securityTabs = [
    { value: "monitoring", label: "Monitoring", icon: <Activity className="h-4 w-4" /> },
    { value: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
    { value: "network", label: "Network", icon: <Network className="h-4 w-4" /> },
    { value: "audit-logs", label: "Audit Logs", icon: <FileText className="h-4 w-4" /> },
  ];

  const generalTabs = [
    { value: "system-status", label: "System Status", icon: <Database className="h-4 w-4" /> },
    { value: "general", label: "General", icon: <SettingsIcon className="h-4 w-4" /> },
    { value: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { value: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  ];

  const allTabs = [
    ...(hasAdminAccess ? adminTabs : []),
    ...generalTabs,
    ...securityTabs,
  ];

  const currentTabData = allTabs.find(tab => tab.value === activeTab);

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden"
        >
          {/* Background gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl" />
          
          <InteractiveCard 
            variant="glass" 
            interactive={false}
            className="relative border-primary/10"
          >
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                    <SettingsIcon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Settings & Configuration
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage your system preferences, security, and integrations
                    </p>
                  </div>
                </div>
                
                {/* Quick stats badges */}
                <div className="flex flex-wrap gap-2">
                  {hasAdminAccess && (
                    <Badge variant="outline" className="border-primary/50 text-primary gap-1">
                      <Crown className="h-3 w-3" />
                      Admin Access
                    </Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Enhanced Security
                  </Badge>
                </div>
              </div>
            </CardContent>
          </InteractiveCard>
        </motion.div>

        {/* Settings Tabs with Mobile Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-4">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Menu className="h-4 w-4" />
                    <span>{currentTabData?.label || 'Settings'}</span>
                  </div>
                  {currentTabData?.icon}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle>Settings Navigation</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
                  <div className="space-y-4 py-4">
                    {hasAdminAccess && (
                      <>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground px-2">Admin</h4>
                          <nav className="space-y-1">
                            {adminTabs.map(tab => (
                              <Button
                                key={tab.value}
                                variant={activeTab === tab.value ? "secondary" : "ghost"}
                                className="w-full justify-start gap-2"
                                onClick={() => {
                                  setActiveTab(tab.value);
                                  setMobileNavOpen(false);
                                }}
                              >
                                {tab.icon}
                                {tab.label}
                              </Button>
                            ))}
                          </nav>
                        </div>
                        <Separator />
                      </>
                    )}
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground px-2">General</h4>
                      <nav className="space-y-1">
                        {generalTabs.map(tab => (
                          <Button
                            key={tab.value}
                            variant={activeTab === tab.value ? "secondary" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => {
                              setActiveTab(tab.value);
                              setMobileNavOpen(false);
                            }}
                          >
                            {tab.icon}
                            {tab.label}
                          </Button>
                        ))}
                      </nav>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground px-2">Security</h4>
                      <nav className="space-y-1">
                        {securityTabs.map(tab => (
                          <Button
                            key={tab.value}
                            variant={activeTab === tab.value ? "secondary" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => {
                              setActiveTab(tab.value);
                              setMobileNavOpen(false);
                            }}
                          >
                            {tab.icon}
                            {tab.label}
                          </Button>
                        ))}
                      </nav>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`hidden lg:inline-flex w-full lg:w-auto ${hasAdminAccess ? "grid-cols-10" : "grid-cols-8"}`}>
              {hasAdminAccess && (
                <>
                  <TabsTrigger value="admin-security" className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="hidden xl:inline">Admin Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="quote-linking" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    <span className="hidden xl:inline">Quote Linking</span>
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="system-status" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden xl:inline">System</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden xl:inline">Monitoring</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden xl:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span className="hidden xl:inline">Network</span>
              </TabsTrigger>
              <TabsTrigger value="audit-logs" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden xl:inline">Audit Logs</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden xl:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden xl:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden xl:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* Admin Security Dashboard Tab - Only for Admins */}
            {hasAdminAccess && (
              <TabsContent value="admin-security" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <AdminSecurityDashboard />
                
                <InteractiveCard variant="elevated" interactive={false}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Admin Account Security Requirements
                    </CardTitle>
                    <CardDescription>
                      Enhanced security measures for administrative access
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                        ⚠️ Security Recommendation
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Admin accounts should always have multi-factor authentication enabled. 
                        This adds an extra layer of protection against unauthorized access.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure your authenticator app below to enable MFA for your admin account.
                      </p>
                      <MultiFactorAuth />
                    </div>
                  </CardContent>
                </InteractiveCard>
              </TabsContent>
            )}

            {/* Quote Linking Tab - Only for Admins */}
            {hasAdminAccess && (
              <TabsContent value="quote-linking" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
                <InteractiveCard variant="elevated" interactive={false}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      Quote Request Linking
                    </CardTitle>
                    <CardDescription>
                      Link orphaned quotes to their corresponding quote requests to prevent duplicate displays in customer portal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LinkOrphanedQuotes />
                  </CardContent>
                </InteractiveCard>
              </TabsContent>
            )}

            {/* System Status Tab */}
            <TabsContent value="system-status" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <div className="space-y-6">
                <InteractiveCard variant="elevated" interactive={false}>
                  <CardHeader>
                    <CardTitle>System Status Overview</CardTitle>
                    <CardDescription>
                      Monitor your backend connection, database health, and system integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Backend Health Check */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">Backend Connection</h3>
                      <p className="text-sm text-muted-foreground">
                        Verify Supabase backend connection and database accessibility
                      </p>
                      <SupabaseHealthCheck />
                    </div>
                  </CardContent>
                </InteractiveCard>

                <InteractiveCard variant="elevated" interactive={false}>
                  <CardHeader>
                    <CardTitle>Product Data Management</CardTitle>
                    <CardDescription>
                      Tools for managing product catalogs and supplier integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold">J. Marr Product Updater</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Manually trigger updates for J. Marr product images and descriptions from the supplier website
                      </p>
                      <JMarrManualUpdater />
                    </div>
                  </CardContent>
                </InteractiveCard>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <InteractiveCard variant="elevated" interactive={false}>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account with two-factor authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiFactorAuth />
                </CardContent>
              </InteractiveCard>

              <AnomalyDetection />
            </TabsContent>

            {/* Security Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <SecurityMonitoring />
            </TabsContent>

            {/* Network Security Tab */}
            <TabsContent value="network" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <NetworkSecurity />
              {hasAdminAccess && (
                <>
                  <IPWhitelistManagement />
                </>
              )}
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="audit-logs" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <AuditLogViewer />
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <GeneralSettingsTab />
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <UserManagementTab />
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6 animate-in fade-in-0 slide-in-from-right-5 duration-300">
              <NotificationPreferencesTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
