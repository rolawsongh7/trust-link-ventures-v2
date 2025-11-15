import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CompletionItem {
  label: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

export const ProfileCompletion: React.FC = () => {
  const { profile } = useCustomerAuth();

  const items: CompletionItem[] = [
    {
      label: 'Basic Information',
      completed: !!(profile?.full_name && profile?.company_name),
    },
    {
      label: 'Contact Details',
      completed: !!(profile?.email && profile?.phone),
    },
    {
      label: 'Add Profile Picture',
      completed: false,
      actionLabel: 'Upload Now',
    },
    {
      label: 'Enable Two-Factor Auth',
      completed: false,
      actionLabel: 'Set Up',
    },
    {
      label: 'Verify Email',
      completed: !!profile?.email,
    },
    {
      label: 'Complete Profile Details',
      completed: !!(profile?.country && profile?.industry),
      actionLabel: 'Add Details',
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const percentage = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="border-l-4 border-l-purple-500 shadow-lg hover:shadow-xl transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Complete Your Profile
          </CardTitle>
          <span className="text-2xl font-bold text-purple-600">{percentage}%</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percentage} className="h-3" />

        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span
                  className={item.completed ? 'text-muted-foreground' : 'font-medium'}
                >
                  {item.label}
                </span>
              </div>
              {!item.completed && item.actionLabel && (
                <Button size="sm" variant="ghost" className="text-maritime-600 hover:text-maritime-700">
                  {item.actionLabel}
                </Button>
              )}
            </div>
          ))}
        </div>

        {percentage < 100 && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-purple-900 dark:text-purple-100">
              🎉 Complete your profile to unlock premium features and better recommendations!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
