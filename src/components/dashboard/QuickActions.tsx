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
      action: () => navigate('/admin/quotes?open=create'),
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      title: 'Add Customer',
      description: 'Register a new customer',
      icon: Users,
      action: () => navigate('/admin/customers?open=add'),
      color: 'bg-green-500/10 text-green-500',
    },
    {
      title: 'Create Order',
      description: 'Process a new order',
      icon: Package,
      action: () => navigate('/admin/orders?open=create'),
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      title: 'Send Email',
      description: 'Communicate with customers',
      icon: Mail,
      action: () => navigate('/admin/communication?open=compose'),
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md shadow-lg border border-white/20 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#1E293B]">Quick Actions</h2>
        <p className="text-sm text-[#64748B] mt-1">Common tasks for faster workflow</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              onClick={action.action}
              aria-label={`${action.title}: ${action.description}`}
              className="group relative h-auto min-h-[80px] flex flex-col items-start p-5 bg-white rounded-xl border border-[#E2E8F0] hover:border-[#3B82F6]/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <div className={`p-3 rounded-xl mb-3 ${action.color} bg-gradient-to-br group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm text-[#0F172A] mb-1">{action.title}</div>
                <div className="text-xs text-[#64748B]">{action.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
