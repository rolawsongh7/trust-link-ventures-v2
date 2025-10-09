import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { isAdminDomain, getAdminUrl, getMainUrl } from "@/utils/domainUtils";
import { useEffect, useMemo } from "react";
import Home from "./pages/Home";
import About from "./pages/About";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Contact from "./pages/Contact";
import Partners from "./pages/Partners";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";
import CRM from "./pages/CRM";
import CustomerPortal from "./pages/CustomerPortal";
import CustomerPortalMain from "./pages/CustomerPortalMain";
import { CustomerCatalog } from "@/components/customer/CustomerCatalog";
import { CustomerCart } from "@/components/customer/CustomerCart";
import { CustomerQuotes } from "@/components/customer/CustomerQuotes";
import { CustomerOrders } from "@/components/customer/CustomerOrders";
import { CustomerProfile } from "@/components/customer/CustomerProfile";
import { CustomerCommunications } from "@/components/customer/CustomerCommunications";
import { CustomerInvoices } from "@/components/customer/CustomerInvoices";
import CustomerAddresses from "@/components/customer/CustomerAddresses";
import OrderTracking from "@/pages/OrderTracking";
import AdminLogin from "./pages/AdminLogin";
import Cookies from "./pages/Cookies";
import Products from "./pages/Products";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteSystem from "./pages/QuoteSystem";
import QuoteRequestManagement from "@/components/QuoteRequestManagement";
import Terms from "./pages/Terms";
import AnalyticsPage from "./pages/AnalyticsPage";
import CustomersPage from "./pages/CustomersPage";
import LeadsPage from "./pages/LeadsPage";
import QuotesPage from "./pages/QuotesPage";
import UnifiedOrdersManagement from "./components/orders/UnifiedOrdersManagement";
import CommunicationPage from "./pages/CommunicationPage";
import Settings from "./pages/Settings";

import UnifiedAuth from "./pages/UnifiedAuth";
import AdminAuth from "./pages/AdminAuth";
import CustomerAuth from "./pages/CustomerAuth";
import Unauthorized from "./pages/Unauthorized";
import NotificationDemo from "./pages/NotificationDemo";
import VirtualAssistant from "./pages/VirtualAssistant";

const queryClient = new QueryClient();

const App = () => {
  const isAdmin = useMemo(() => isAdminDomain(), []);
  const isLovablePreview = useMemo(() => window.location.hostname.includes('lovableproject.com'), []);

  // In preview mode, we show ALL routes (both admin and public)
  // In production, we show either admin OR public based on subdomain
  const showBothRoutes = isLovablePreview;
  const showOnlyAdminRoutes = !isLovablePreview && isAdmin;
  const showOnlyPublicRoutes = !isLovablePreview && !isAdmin;

  // Security: Prevent admin routes from being accessible on main domain (except on preview for testing)
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Skip redirects on Lovable preview for testing purposes
    if (isLovablePreview) {
      return;
    }
    
    // If on main domain but trying to access admin routes
    if (!isAdmin && currentPath.startsWith('/admin')) {
      const adminUrl = getAdminUrl(currentPath);
      window.location.href = adminUrl;
    }
    
    // If on admin domain but trying to access public/customer routes
    if (isAdmin && !currentPath.startsWith('/admin') && currentPath !== '/' && currentPath !== '/unauthorized') {
      window.location.href = getMainUrl(currentPath);
    }
  }, [isAdmin, isLovablePreview]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CustomerAuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  {/* LOVABLE PREVIEW MODE - Show both admin and public routes */}
                  {showBothRoutes && (
                    <>
                      {/* Admin routes */}
                      <Route path="/admin/login" element={<AdminAuth />} />
                      <Route path="/unauthorized" element={<Unauthorized />} />
                      
                      <Route path="/admin" element={
                        <AdminProtectedRoute>
                          <AdminLayout />
                        </AdminProtectedRoute>
                      }>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="leads" element={<LeadsPage />} />
                        <Route path="quotes" element={<QuotesPage />} />
                        <Route path="orders" element={<UnifiedOrdersManagement />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="virtual-assistant" element={<VirtualAssistant />} />
                      </Route>
                      
                      {/* Public routes */}
                      <Route element={<PublicLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/partners" element={<Partners />} />
                        <Route path="/quote-request" element={<QuoteRequest />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="/notifications" element={<NotificationDemo />} />
                      </Route>
                      
                      {/* Customer Auth Routes */}
                      <Route path="/customer-auth" element={<CustomerAuth />} />
                      <Route path="/customer-portal" element={<CustomerPortal />} />
                      
                      {/* Customer Portal Protected Routes */}
                      <Route path="/customer/*" element={
                        <CustomerProtectedRoute>
                          <CustomerLayout />
                        </CustomerProtectedRoute>
                      }>
                        <Route index element={<CustomerPortalMain />} />
                        <Route path="catalog" element={<CustomerCatalog />} />
                        <Route path="cart" element={<CustomerCart />} />
                        <Route path="quotes" element={<CustomerQuotes />} />
                        <Route path="orders" element={<CustomerOrders />} />
                        <Route path="orders/:orderId" element={<OrderTracking />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="profile" element={<CustomerProfile />} />
                      </Route>
                      
                      {/* Public order tracking */}
                      <Route path="/track" element={<OrderTracking />} />
                      
                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                  
                  {/* ADMIN DOMAIN ONLY (Production) */}
                  {showOnlyAdminRoutes && (
                    <>
                      <Route path="/" element={<AdminAuth />} />
                      <Route path="/admin/login" element={<AdminAuth />} />
                      <Route path="/unauthorized" element={<Unauthorized />} />
                      
                      <Route path="/admin" element={
                        <AdminProtectedRoute>
                          <AdminLayout />
                        </AdminProtectedRoute>
                      }>
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="leads" element={<LeadsPage />} />
                        <Route path="quotes" element={<QuotesPage />} />
                        <Route path="orders" element={<UnifiedOrdersManagement />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="virtual-assistant" element={<VirtualAssistant />} />
                      </Route>
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                  
                  {/* PUBLIC/CUSTOMER DOMAIN ONLY (Production) */}
                  {showOnlyPublicRoutes && (
                    <>
                      {/* Public routes */}
                      <Route element={<PublicLayout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/partners" element={<Partners />} />
                        <Route path="/quote-request" element={<QuoteRequest />} />
                        <Route path="/privacy" element={<Privacy />} />
                        <Route path="/terms" element={<Terms />} />
                        <Route path="/cookies" element={<Cookies />} />
                        <Route path="/notifications" element={<NotificationDemo />} />
                      </Route>
                      
                      {/* Customer Auth Routes */}
                      <Route path="/customer-auth" element={<CustomerAuth />} />
                      <Route path="/customer-portal" element={<CustomerPortal />} />
                      
                      {/* Customer Portal Protected Routes */}
                      <Route path="/customer/*" element={
                        <CustomerProtectedRoute>
                          <CustomerLayout />
                        </CustomerProtectedRoute>
                      }>
                        <Route index element={<CustomerPortalMain />} />
                        <Route path="catalog" element={<CustomerCatalog />} />
                        <Route path="cart" element={<CustomerCart />} />
                        <Route path="quotes" element={<CustomerQuotes />} />
                        <Route path="orders" element={<CustomerOrders />} />
                        <Route path="orders/:orderId" element={<OrderTracking />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="profile" element={<CustomerProfile />} />
                      </Route>
                      
                      {/* Public order tracking */}
                      <Route path="/track" element={<OrderTracking />} />
                      
                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
