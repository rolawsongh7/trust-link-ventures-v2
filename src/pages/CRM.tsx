import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, FileText, Phone, BarChart3, Target, Upload, ClipboardList, LineChart, Zap } from 'lucide-react';
import CustomerManagement from '@/components/CustomerManagement';
import LeadsManagement from '@/components/LeadsManagement';
import QuotesManagement from '@/components/QuotesManagement';
import CommunicationsManagement from '@/components/CommunicationsManagement';
import CRMDashboard from '@/components/CRMDashboard';
import QuoteRequestManagement from '@/components/QuoteRequestManagement';
import AnalyticsReports from '@/components/AnalyticsReports';
import DirectSalesComponents from '@/components/DirectSalesComponents';
import { SupabaseHealthCheck } from '@/components/utils/SupabaseHealthCheck';

const CRM = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  console.log('CRM Component - User:', user, 'Loading:', loading, 'ActiveTab:', activeTab);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <SupabaseHealthCheck />
        </div>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">CRM Dashboard</h1>
          <p className="text-muted-foreground">Manage your customers, leads, and business relationships</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="quote-requests" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Quote Requests
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="direct-sales" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Direct Sales
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Communications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <CRMDashboard />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <LeadsManagement />
          </TabsContent>

          <TabsContent value="quote-requests" className="mt-6">
            <QuoteRequestManagement />
          </TabsContent>

          <TabsContent value="quotes" className="mt-6">
            <QuotesManagement />
          </TabsContent>

          <TabsContent value="direct-sales" className="mt-6">
            <DirectSalesComponents />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsReports />
          </TabsContent>

          <TabsContent value="communications" className="mt-6">
            <CommunicationsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CRM;