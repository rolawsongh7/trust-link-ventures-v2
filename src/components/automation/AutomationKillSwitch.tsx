/**
 * Phase 4.1: Automation Kill Switch
 * Emergency controls for disabling all automation
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Power, 
  AlertTriangle,
  ShieldOff
} from 'lucide-react';
import { useIsAutomationEnabled, useAutomationMutations } from '@/hooks/useAutomation';
import { useRoleAuth } from '@/hooks/useRoleAuth';

export const AutomationKillSwitch: React.FC = () => {
  const { data: isEnabled } = useIsAutomationEnabled();
  const { toggleGlobal, isToggling } = useAutomationMutations();
  const { hasSuperAdminAccess } = useRoleAuth();
  const [reason, setReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!hasSuperAdminAccess) {
    return null;
  }

  const handleEmergencyDisable = () => {
    toggleGlobal({ 
      enabled: false, 
      reason: reason || 'Emergency kill switch activated' 
    });
    setIsDialogOpen(false);
    setReason('');
  };

  // Only show when automation is enabled
  if (!isEnabled) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-muted-foreground">Kill Switch</CardTitle>
              <CardDescription>
                Automation is already disabled
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-red-500/50 bg-red-500/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Power className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-red-600 dark:text-red-400">
                Emergency Kill Switch
              </CardTitle>
              <CardDescription>
                Immediately disable all automation
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                disabled={isToggling}
              >
                <Power className="h-4 w-4" />
                Disable All Automation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Confirm Emergency Disable
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately disable all automation rules. No rules will execute
                  until automation is re-enabled. This action is logged in the audit trail.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="py-4">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Input
                  id="reason"
                  placeholder="Enter reason for disabling..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEmergencyDisable}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Disable Automation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <p className="text-xs text-muted-foreground mt-3 text-center">
            This action requires super admin privileges and is logged
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
