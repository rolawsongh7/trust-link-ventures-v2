import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { PerformanceMonitor } from '@/components/debug/PerformanceMonitor';
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { getAdminUrl, getMainUrl } from "@/utils/domainUtils";
import { isAdminDomain, isNativeApp, isPreviewDomain } from "@/utils/env";
import { BlockAdmin } from "@/routes/BlockAdmin";
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
import { CustomerAddresses } from "@/components/customer/CustomerAddresses";
import { CustomerMore } from "@/pages/CustomerMore";
import CustomerNotifications from "@/pages/CustomerNotifications";
import CustomerAnalytics from "@/pages/CustomerAnalytics";
import CustomerHelp from "@/pages/CustomerHelp";
import CustomerFavorites from "@/pages/CustomerFavorites";
import QuoteView from "@/pages/QuoteView";
import ManualQuoteAnalytics from "@/components/analytics/ManualQuoteAnalytics";
import CurrencyAnalytics from "@/components/analytics/CurrencyAnalytics";
import OrderTracking from "@/pages/OrderTracking";

import PaymentCallback from "@/pages/PaymentCallback";
import AdminLogin from "./pages/AdminLogin";
import Cookies from "./pages/Cookies";
import Products from "./pages/Products";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteSystem from "./pages/QuoteSystem";
import QuoteRequestManagement from "@/components/QuoteRequestManagement";
import Terms from "./pages/Terms";
import AdvancedAnalytics from "./pages/AdvancedAnalytics"; // Enterprise BI
import CustomersPage from "./pages/CustomersPage";
import LeadsPage from "./pages/LeadsPage";
import QuotesPage from "./pages/QuotesPage";
import UnifiedOrdersManagement from "./components/orders/UnifiedOrdersManagement";
import CommunicationPage from "./pages/CommunicationPage";
import Settings from "./pages/Settings";
import InvoicesPage from "./pages/InvoicesPage";
import PriceManagement from "./pages/admin/PriceManagement";
import Diagnostics from "./pages/admin/Diagnostics";
import OrderIssues from "./pages/admin/OrderIssues";
import FinancialReconciliation from "./pages/admin/FinancialReconciliation";
import CustomerIssueDetail from "./pages/CustomerIssueDetail";
import CustomerIssues from "./pages/CustomerIssues";

import UnifiedAuth from "./pages/UnifiedAuth";
import AdminAuth from "./pages/AdminAuth";
import CustomerAuth from "./pages/CustomerAuth";
import Unauthorized from "./pages/Unauthorized";
import NotificationSettingsPage from "./pages/NotificationSettings";
import MobileHub from "./pages/MobileHub";
import CustomerSettings from "./pages/CustomerSettings";
import ProductDetail from "./pages/ProductDetail";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Check if running as native app
  const nativeApp = isNativeApp();
  
  const isLovablePreview = useMemo(() => 
    !nativeApp && (window.location.hostname.includes('lovable.app') || 
    window.location.hostname.includes('lovableproject.com')), 
  [nativeApp]);
  
  const isAdmin = useMemo(() => {
    // Native apps never have admin access
    if (nativeApp || isLovablePreview) return false;
    return isAdminDomain();
  }, [nativeApp, isLovablePreview]);

  // Native apps: only public + customer routes
  // Web preview: both admin and public routes (testing)
  // Web production: admin OR public based on subdomain
  const showBothRoutes = !nativeApp && isLovablePreview;
  const showOnlyAdminRoutes = !nativeApp && !isLovablePreview && isAdmin;
  const showOnlyPublicRoutes = nativeApp || (!isLovablePreview && !isAdmin);

  // Security: Prevent admin routes from being accessible on main domain (except on preview for testing)
  // Skip this entire check in native apps
  useEffect(() => {
    if (nativeApp) return; // Skip in native apps
    
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
  }, [nativeApp, isAdmin, isLovablePreview]);

  // Add has-bottom-nav class for native apps (for floating UI positioning)
  useEffect(() => {
    if (nativeApp) {
      document.body.classList.add('has-bottom-nav');
    }
    return () => {
      document.body.classList.remove('has-bottom-nav');
    };
  }, [nativeApp]);

  // Native app: redirect to /hub on initial load if on root path
  useEffect(() => {
    if (nativeApp && window.location.hash === '' || window.location.hash === '#/') {
      window.location.hash = '#/hub';
    }
  }, [nativeApp]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <CustomerAuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                {import.meta.env.DEV && <PerformanceMonitor />}
              {nativeApp ? (
                <HashRouter>
                  <ScrollToTop />
                  {/* Hard block admin routes in native apps */}
                  <BlockAdmin />
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
                        <Route path="analytics/manual-quotes" element={<ManualQuoteAnalytics />} />
                        <Route path="analytics/currency" element={<CurrencyAnalytics />} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="leads" element={<LeadsPage />} />
                        <Route path="quotes" element={<QuotesPage />} />
                        <Route path="orders" element={<UnifiedOrdersManagement />} />
                        <Route path="invoices" element={<InvoicesPage />} />
                        <Route path="price-management" element={<PriceManagement />} />
                        <Route path="analytics" element={<AdvancedAnalytics />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="diagnostics" element={<Diagnostics />} />
                        <Route path="orders/issues" element={<OrderIssues />} />
                        <Route path="finance/reconciliation" element={<FinancialReconciliation />} />
                      </Route>
                      
                      {/* Mobile Hub - standalone page outside PublicLayout */}
                      <Route path="/hub" element={<MobileHub />} />
                      
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
                        <Route path="/notifications" element={<NotificationSettingsPage />} />
                        <Route path="/quote-view/:token" element={<QuoteView />} />
                      </Route>
                      
                      {/* Portal routes (new primary path) */}
                      <Route path="/portal-auth" element={<CustomerAuth />} />
                      <Route path="/portal/login" element={<CustomerAuth />} />
                      
                      <Route path="/portal/*" element={
                        <CustomerProtectedRoute>
                          <CustomerLayout />
                        </CustomerProtectedRoute>
                      }>
                        <Route index element={<CustomerPortalMain />} />
                        <Route path="catalog" element={<CustomerCatalog />} />
                        <Route path="catalog/:productId" element={<ProductDetail />} />
                        <Route path="cart" element={<CustomerCart />} />
                        <Route path="quotes" element={<CustomerQuotes />} />
                        <Route path="orders" element={<CustomerOrders />} />
                        <Route path="orders/:orderId" element={<OrderTracking />} />
                        <Route path="order-issues" element={<CustomerIssues />} />
                        <Route path="order-issues/:id" element={<CustomerIssueDetail />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="favorites" element={<CustomerFavorites />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="notifications" element={<CustomerNotifications />} />
                        <Route path="profile" element={<CustomerProfile />} />
                        <Route path="settings" element={<CustomerSettings />} />
                        <Route path="analytics" element={<CustomerAnalytics />} />
                        <Route path="help" element={<CustomerHelp />} />
                        <Route path="payment-callback" element={<PaymentCallback />} />
                      </Route>
                      
                      {/* Customer Auth Routes - Redirect to Portal */}
                      <Route path="/customer-auth" element={<Navigate to="/portal-auth" replace />} />
                      <Route path="/customer-portal" element={<Navigate to="/portal/login" replace />} />
                      
                      {/* Old Customer Portal Routes - Redirect to Portal */}
                      <Route path="/customer/*" element={<Navigate to="/portal" replace />} />
                      
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
                        <Route path="invoices" element={<InvoicesPage />} />
                        <Route path="price-management" element={<PriceManagement />} />
                        <Route path="analytics" element={<AdvancedAnalytics />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="diagnostics" element={<Diagnostics />} />
                        <Route path="orders/issues" element={<OrderIssues />} />
                        <Route path="finance/reconciliation" element={<FinancialReconciliation />} />
                        <Route path="analytics/manual-quotes" element={<ManualQuoteAnalytics />} />
                        <Route path="analytics/currency" element={<CurrencyAnalytics />} />
                      </Route>
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                  
                  {/* PUBLIC/CUSTOMER DOMAIN ONLY (Production) */}
                  {showOnlyPublicRoutes && (
                    <>
                      {/* Mobile Hub - standalone page outside PublicLayout */}
                      <Route path="/hub" element={<MobileHub />} />
                      
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
                        <Route path="/notifications" element={<NotificationSettingsPage />} />
                      </Route>
                      
                      {/* Portal routes (new primary path) */}
                      <Route path="/portal-auth" element={<CustomerAuth />} />
                      <Route path="/portal/login" element={<CustomerAuth />} />
                      
                      <Route path="/portal/*" element={
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
                        <Route path="order-issues" element={<CustomerIssues />} />
                        <Route path="order-issues/:id" element={<CustomerIssueDetail />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="favorites" element={<CustomerFavorites />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="notifications" element={<CustomerNotifications />} />
                        <Route path="analytics" element={<CustomerAnalytics />} />
                        <Route path="help" element={<CustomerHelp />} />
                        <Route path="profile" element={<CustomerProfile />} />
                        <Route path="settings" element={<CustomerSettings />} />
                        <Route path="payment-callback" element={<PaymentCallback />} />
                      </Route>
                      
                      {/* Customer Auth Routes - Redirect to Portal */}
                      <Route path="/customer-auth" element={<Navigate to="/portal-auth" replace />} />
                      <Route path="/customer-portal" element={<Navigate to="/portal/login" replace />} />
                      
                      {/* Old Customer Portal Routes - Redirect to Portal */}
                      <Route path="/customer/*" element={<Navigate to="/portal" replace />} />
                      
                      {/* Public order tracking */}
                      <Route path="/track" element={<OrderTracking />} />
                      
                      {/* Catch all */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                </Routes>
                <MobileBottomNav />
              </HashRouter>
            ) : (
              <BrowserRouter>
                <ScrollToTop />
                <Routes>
                  {/* Same routes for web */}
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
                        <Route path="invoices" element={<InvoicesPage />} />
                        <Route path="price-management" element={<PriceManagement />} />
                        <Route path="analytics" element={<AdvancedAnalytics />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="diagnostics" element={<Diagnostics />} />
                        <Route path="orders/issues" element={<OrderIssues />} />
                        <Route path="finance/reconciliation" element={<FinancialReconciliation />} />
                        <Route path="analytics/manual-quotes" element={<ManualQuoteAnalytics />} />
                        <Route path="analytics/currency" element={<CurrencyAnalytics />} />
                      </Route>
                      
                      {/* Mobile Hub - standalone page outside PublicLayout */}
                      <Route path="/hub" element={<MobileHub />} />
                      
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
                        <Route path="/notifications" element={<NotificationSettingsPage />} />
                      </Route>
                      
                      {/* Customer Portal routes */}
                      <Route path="/portal-auth" element={<CustomerAuth />} />
                      <Route path="/login" element={<CustomerAuth />} />
                      
                      <Route path="/portal" element={
                        <CustomerProtectedRoute>
                          <CustomerLayout />
                        </CustomerProtectedRoute>
                      }>
                        <Route index element={<CustomerPortalMain />} />
                        <Route path="catalog" element={<CustomerCatalog />} />
                        <Route path="cart" element={<CustomerCart />} />
                        <Route path="quotes" element={<CustomerQuotes />} />
                        <Route path="quotes/:quoteId" element={<CustomerQuotes />} />
                        <Route path="orders" element={<CustomerOrders />} />
                        <Route path="orders/:orderId" element={<OrderTracking />} />
                        <Route path="order-issues" element={<CustomerIssues />} />
                        <Route path="order-issues/:id" element={<CustomerIssueDetail />} />
                        <Route path="favorites" element={<CustomerFavorites />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="profile" element={<CustomerProfile />} />
                        <Route path="notifications" element={<CustomerNotifications />} />
                        <Route path="more" element={<CustomerMore />} />
                        <Route path="help" element={<CustomerHelp />} />
                        <Route path="analytics" element={<CustomerAnalytics />} />
                        <Route path="settings" element={<CustomerSettings />} />
                        <Route path="payment-callback" element={<PaymentCallback />} />
                      </Route>
                      
                      {/* Public tracking and payment pages */}
                      <Route path="/track" element={<OrderTracking />} />
                      <Route path="/payment/callback" element={<PaymentCallback />} />
                      
                      {/* Legacy customer routes - redirect to portal */}
                      <Route path="/customer/*" element={<Navigate to="/portal" replace />} />
                      <Route path="/customer-auth" element={<Navigate to="/portal-auth" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                  
                  {showOnlyAdminRoutes && (
                    <>
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
                        <Route path="invoices" element={<InvoicesPage />} />
                        <Route path="price-management" element={<PriceManagement />} />
                        <Route path="analytics" element={<AdvancedAnalytics />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="quote-inquiries" element={<QuoteRequestManagement />} />
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="quote-system" element={<QuoteSystem />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="diagnostics" element={<Diagnostics />} />
                        <Route path="orders/issues" element={<OrderIssues />} />
                        <Route path="finance/reconciliation" element={<FinancialReconciliation />} />
                        <Route path="analytics/manual-quotes" element={<ManualQuoteAnalytics />} />
                        <Route path="analytics/currency" element={<CurrencyAnalytics />} />
                      </Route>
                      
                      {/* Redirect all other routes to admin login */}
                      <Route path="*" element={<Navigate to="/admin/login" replace />} />
                    </>
                  )}
                  
                  {showOnlyPublicRoutes && (
                    <>
                      {/* Mobile Hub - standalone page outside PublicLayout */}
                      <Route path="/hub" element={<MobileHub />} />
                      
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
                        <Route path="/notifications" element={<NotificationSettingsPage />} />
                      </Route>
                      
                      {/* Customer Portal routes */}
                      <Route path="/portal-auth" element={<CustomerAuth />} />
                      <Route path="/login" element={<CustomerAuth />} />
                      
                      <Route path="/portal" element={
                        <CustomerProtectedRoute>
                          <CustomerLayout />
                        </CustomerProtectedRoute>
                      }>
                        <Route index element={<CustomerPortalMain />} />
                        <Route path="catalog" element={<CustomerCatalog />} />
                        <Route path="cart" element={<CustomerCart />} />
                        <Route path="quotes" element={<CustomerQuotes />} />
                        <Route path="quotes/:quoteId" element={<CustomerQuotes />} />
                        <Route path="orders" element={<CustomerOrders />} />
                        <Route path="orders/:orderId" element={<OrderTracking />} />
                        <Route path="order-issues" element={<CustomerIssues />} />
                        <Route path="order-issues/:id" element={<CustomerIssueDetail />} />
                        <Route path="favorites" element={<CustomerFavorites />} />
                        <Route path="invoices" element={<CustomerInvoices />} />
                        <Route path="communications" element={<CustomerCommunications />} />
                        <Route path="addresses" element={<CustomerAddresses />} />
                        <Route path="profile" element={<CustomerProfile />} />
                        <Route path="notifications" element={<CustomerNotifications />} />
                        <Route path="more" element={<CustomerMore />} />
                        <Route path="help" element={<CustomerHelp />} />
                        <Route path="analytics" element={<CustomerAnalytics />} />
                        <Route path="settings" element={<CustomerSettings />} />
                        <Route path="payment-callback" element={<PaymentCallback />} />
                      </Route>
                      
                      {/* Public tracking and payment pages */}
                      <Route path="/track" element={<OrderTracking />} />
                      <Route path="/payment/callback" element={<PaymentCallback />} />
                      
                      {/* Legacy customer routes - redirect to portal */}
                      <Route path="/customer/*" element={<Navigate to="/portal" replace />} />
                      <Route path="/customer-auth" element={<Navigate to="/portal-auth" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFound />} />
                    </>
                  )}
                </Routes>
              </BrowserRouter>
            )}
            </TooltipProvider>
          </CustomerAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
