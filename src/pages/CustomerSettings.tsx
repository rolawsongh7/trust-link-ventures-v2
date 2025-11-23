import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BiometricSettings } from "@/components/customer/BiometricSettings";
import { CustomerMFASetup } from "@/components/customer/CustomerMFASetup";
import { SecurityScore } from "@/components/customer/SecurityScore";
import { ChangePasswordDialog } from "@/components/customer/ChangePasswordDialog";
import { Shield, Key, Fingerprint, Bell } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";

export default function CustomerSettings() {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your security preferences and account settings
          </p>
        </div>

        {/* Security Overview */}
        <div className="mb-8">
          <SecurityScore
            onChangePassword={() => setChangePasswordOpen(true)}
            onSetupMFA={() => setMfaSetupOpen(true)}
            onViewSessions={() => {}}
            onManageAlerts={() => {}}
          />
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="security" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-2">
              <Fingerprint className="h-4 w-4" />
              Biometric
            </TabsTrigger>
            <TabsTrigger value="mfa" className="gap-2">
              <Key className="h-4 w-4" />
              2FA
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Password Security</h2>
              <p className="text-muted-foreground mb-4">
                Keep your account secure by using a strong password and changing it regularly.
              </p>
              <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
              />
            </Card>
          </TabsContent>

          <TabsContent value="biometric" className="space-y-6">
            <BiometricSettings />
          </TabsContent>

          <TabsContent value="mfa" className="space-y-6">
            <Card className="p-6">
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

          <TabsContent value="notifications" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
              <p className="text-muted-foreground">
                Notification settings will be available soon.
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
