import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SupabaseHealthCheck } from '@/components/utils/SupabaseHealthCheck';
import { JMarrManualUpdater } from '@/components/admin/JMarrManualUpdater';
import { MultiFactorAuth } from '@/components/security/MultiFactorAuth';
import { Settings as SettingsIcon, Database, Bell, Users, Shield } from 'lucide-react';

const Settings = () => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground">Manage your system preferences and configuration</p>
            </div>
          </div>
        </motion.div>

        {/* Settings Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs defaultValue="system-status" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto">
              <TabsTrigger value="system-status" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">System Status</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
            </TabsList>

            {/* System Status Tab */}
            <TabsContent value="system-status" className="space-y-6">
              <div className="space-y-6">
                <Card>
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
                </Card>

                <Card>
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
                </Card>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>
                    Add an extra layer of security to your account with two-factor authentication
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MultiFactorAuth />
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Configure general application preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">General settings will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* User Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">User management tools will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Configure how and when you receive notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Notification settings will be available here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
