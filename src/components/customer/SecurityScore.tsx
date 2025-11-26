import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock, Smartphone, Bell, Eye, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface SecurityItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'active' | 'inactive' | 'warning';
  actionLabel: string;
  onAction?: () => void;
}

const SecurityItem: React.FC<SecurityItemProps> = ({
  icon,
  title,
  description,
  status,
  actionLabel,
  onAction,
}) => {
  const statusConfig = {
    active: { color: 'text-emerald-500', badge: 'Enabled', badgeVariant: 'default' as const },
    inactive: { color: 'text-red-500', badge: 'Not Enabled', badgeVariant: 'destructive' as const },
    warning: { color: 'text-orange-500', badge: 'Action Needed', badgeVariant: 'outline' as const },
  };

  const config = statusConfig[status];

  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
          {icon}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{title}</h4>
            <Badge variant={config.badgeVariant}>{config.badge}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface SecurityScoreProps {
  onChangePassword: () => void;
  onSetupMFA: () => void;
  onViewSessions?: () => void;
  onManageAlerts?: () => void;
  lastPasswordChanged?: string | null;
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({
  onChangePassword,
  onSetupMFA,
  onViewSessions,
  onManageAlerts,
  lastPasswordChanged,
}) => {
  const securityScore = 7;

  // Calculate days since password change
  const getDaysSincePasswordChange = () => {
    if (!lastPasswordChanged) return null;
    const days = Math.floor((Date.now() - new Date(lastPasswordChanged).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  // Get password description based on last change
  const getPasswordDescription = () => {
    const days = getDaysSincePasswordChange();
    if (days === null) {
      return "Password set • Strength: Strong";
    }
    return `Last changed: ${days} days ago • Strength: Strong`;
  };

  // Get password status (only warn after 180 days / 6 months)
  const getPasswordStatus = () => {
    const days = getDaysSincePasswordChange();
    if (days === null || days <= 180) {
      return 'active' as const;
    }
    return 'warning' as const;
  };

  return (
    <Card className="border-l-4 border-l-emerald-500 shadow-lg hover:shadow-xl transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-500" />
          Account Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Security Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Security Score</span>
            <span className="text-2xl font-bold text-emerald-600">{securityScore}/10</span>
          </div>
          <Progress value={securityScore * 10} className="h-3" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Status: Good • 3 recommended actions</span>
          </div>
        </div>

        {/* Security Items */}
        <div className="space-y-3">
          <SecurityItem
            icon={<Lock className="h-5 w-5" />}
            title="Password"
            description={getPasswordDescription()}
            status={getPasswordStatus()}
            actionLabel="Change Password"
            onAction={onChangePassword}
          />

          <SecurityItem
            icon={<Shield className="h-5 w-5" />}
            title="Two-Factor Authentication"
            description="Security boost: +30% • Recommended for all accounts"
            status="inactive"
            actionLabel="Enable Now"
            onAction={onSetupMFA}
          />

          <SecurityItem
            icon={<Smartphone className="h-5 w-5" />}
            title="Active Sessions"
            description="2 active devices • Last login: 2 hours ago"
            status="active"
            actionLabel="View All"
            onAction={onViewSessions}
          />

          <SecurityItem
            icon={<Bell className="h-5 w-5" />}
            title="Security Alerts"
            description="Email notifications for security events"
            status="active"
            actionLabel="Manage"
            onAction={onManageAlerts}
          />
        </div>
      </CardContent>
    </Card>
  );
};
