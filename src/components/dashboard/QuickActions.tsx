import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Users, Package, Mail } from 'lucide-react';

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Create Quote',
      description: 'Generate a new quote for a customer',
      icon: FileText,
      action: () => navigate('/quotes'),
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Add Customer',
      description: 'Register a new customer',
      icon: Users,
      action: () => navigate('/customers'),
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'Create Order',
      description: 'Process a new order',
      icon: Package,
      action: () => navigate('/orders'),
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Send Email',
      description: 'Communicate with customers',
      icon: Mail,
      action: () => navigate('/communications'),
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks for faster workflow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto flex-col items-start p-4 hover:bg-muted"
                onClick={action.action}
              >
                <div className={`p-2 rounded-lg mb-2 ${action.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
