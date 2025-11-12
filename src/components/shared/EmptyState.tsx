import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <Card className={`text-center py-12 bg-tl-surface border border-tl-border rounded-lg shadow-sm ${className}`}>
      <CardContent>
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-tl-accent/10 flex items-center justify-center">
          <Icon className="h-10 w-10 text-tl-accent" />
        </div>
        <h3 className="text-xl font-semibold text-tl-primary mb-2">{title}</h3>
        <p className="text-tl-muted mb-6">{description}</p>
        {actionLabel && onAction && (
          <Button className="bg-tl-gradient text-white hover:opacity-95" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
