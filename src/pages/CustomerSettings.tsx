import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiometricSettings } from "@/components/customer/BiometricSettings";
import { CustomerMFASetup } from "@/components/customer/CustomerMFASetup";
import { SecurityScore } from "@/components/customer/SecurityScore";
import { ChangePasswordDialog } from "@/components/customer/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/customer/DeleteAccountDialog";
import { MobileThemeSelector } from "@/components/customer/settings/MobileThemeSelector";
import { Shield, Key, Fingerprint, Bell, Palette, ChevronRight, HelpCircle, FileText, Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { SupportContactCard } from "@/components/common/SupportContactCard";

const settingsLinks = [
  {
    label: "Help & Support",
    description: "FAQs and contact support",
    icon: HelpCircle,
    href: "/portal/help",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    label: "Terms of Service",
    description: "Read our terms",
    icon: FileText,
    href: "/terms",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    label: "Privacy Policy",
    description: "How we protect your data",
    icon: Shield,
    href: "/privacy",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    label: "About Trust Link",
    description: "Learn more about us",
    icon: Info,
    href: "/about",
    gradient: "from-purple-500 to-violet-500",
  },
];

export default function CustomerSettings() {
  const { profile } = useCustomerAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-2">
              <Fingerprint className="h-4 w-4" />
              <span className="hidden sm:inline">Biometric</span>
            </TabsTrigger>
            <TabsTrigger value="mfa" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">2FA</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/30 dark:border-slate-800/30">
              <h2 className="text-xl font-semibold mb-2">Theme</h2>
              <p className="text-muted-foreground mb-6">
                Choose how Trust Link looks to you
              </p>
              <MobileThemeSelector />
            </Card>

            {/* Additional Settings Links */}
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/30 dark:border-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">More</h2>
              <div className="space-y-2">
                {settingsLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <motion.div key={link.href} whileTap={{ scale: 0.98 }}>
                      <Link
                        to={link.href}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                      >
                        <div
                          className={`h-10 w-10 rounded-full bg-gradient-to-br ${link.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {link.label}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {link.description}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityScore
              onChangePassword={() => setChangePasswordOpen(true)}
              onSetupMFA={() => setMfaSetupOpen(true)}
              onViewSessions={() => {}}
              onManageAlerts={() => {}}
            />
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/30 dark:border-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">Password Security</h2>
              <p className="text-muted-foreground mb-4">
                Keep your account secure by using a strong password and changing it regularly.
              </p>
              <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
              />
            </Card>

            {/* Danger Zone - Delete Account */}
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <h2 className="text-xl font-semibold text-destructive mb-2">Danger Zone</h2>
              <p className="text-muted-foreground mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setDeleteAccountOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
              
              {profile?.email && (
                <DeleteAccountDialog
                  open={deleteAccountOpen}
                  onOpenChange={setDeleteAccountOpen}
                  userEmail={profile.email}
                />
              )}
            </Card>
          </TabsContent>

          {/* Biometric Tab */}
          <TabsContent value="biometric" className="space-y-6">
            <BiometricSettings />
          </TabsContent>

          {/* MFA Tab */}
          <TabsContent value="mfa" className="space-y-6">
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/30 dark:border-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
              <p className="text-muted-foreground mb-4">
                Add an extra layer of security with authenticator app verification.
              </p>
              <CustomerMFASetup
                open={mfaSetupOpen}
                onOpenChange={setMfaSetupOpen}
              />
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/30 dark:border-slate-800/30">
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
              <p className="text-muted-foreground mb-4">
                Manage your notification preferences for order updates, quotes, and deliveries.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-muted-foreground">Get notified about order status changes</p>
                  </div>
                  <div className="text-sm text-primary font-medium">Enabled</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Quote Responses</p>
                    <p className="text-sm text-muted-foreground">Notifications when quotes are ready</p>
                  </div>
                  <div className="text-sm text-primary font-medium">Enabled</div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-medium">Delivery Updates</p>
                    <p className="text-sm text-muted-foreground">Real-time delivery tracking alerts</p>
                  </div>
                  <div className="text-sm text-primary font-medium">Enabled</div>
                </div>
              </div>
            </Card>
            
            {/* Support Contact */}
            <SupportContactCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
