import React from 'react';
import { motion } from 'framer-motion';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { PendingApprovals } from '@/components/dashboard/PendingApprovals';

const Dashboard = () => {

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Gradient Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E40AF] via-[#3B82F6] to-[#0EA5E9] p-8 shadow-xl"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '32px 32px'
            }} />
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">Dashboard</h1>
              <p className="text-white/90 text-base">Welcome back! Here's what's happening with your business.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/70">Last updated</p>
              <p className="text-sm font-medium text-white">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <DashboardMetrics />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <QuickActions />
        </motion.div>

        {/* Pending Approvals and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <PendingApprovals />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <RecentActivityFeed />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;