import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
import { CustomerLayout } from "@/components/customer/CustomerLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
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
import AdminLogin from "./pages/AdminLogin";
import Cookies from "./pages/Cookies";
import Products from "./pages/Products";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteSystem from "./pages/QuoteSystem";
import Terms from "./pages/Terms";
import AnalyticsPage from "./pages/AnalyticsPage";
import CustomersPage from "./pages/CustomersPage";
import LeadsPage from "./pages/LeadsPage";
import OrdersPage from "./pages/OrdersPage";
import QuotesPage from "./pages/QuotesPage";
import CommunicationPage from "./pages/CommunicationPage";
import AccountingPage from "./pages/AccountingPage";
import RFQPage from "./pages/RFQPage";
import UnifiedAuth from "./pages/UnifiedAuth";
import NotificationDemo from "./pages/NotificationDemo";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
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
            
            {/* Auth routes (standalone) */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/login" element={<UnifiedAuth />} />
            <Route path="/customer-portal" element={<CustomerPortal />} />
            
            {/* Customer Portal Protected Routes */}
            <Route path="/customer" element={
              <CustomerProtectedRoute>
                <CustomerLayout />
              </CustomerProtectedRoute>
            }>
              <Route index element={<CustomerPortalMain />} />
              <Route path="catalog" element={<CustomerCatalog />} />
              <Route path="cart" element={<CustomerCart />} />
              <Route path="quotes" element={<CustomerQuotes />} />
              <Route path="orders" element={<CustomerOrders />} />
              <Route path="communications" element={<CustomerCommunications />} />
              <Route path="profile" element={<CustomerProfile />} />
            </Route>

            
            <Route path="/admin-login" element={<AdminLogin />} />
            
            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/rfqs" element={<RFQPage />} />
              <Route path="/quote-inquiries" element={<div>Quote Inquiries Page</div>} />
              <Route path="/communication" element={<CommunicationPage />} />
              <Route path="/accounting" element={<AccountingPage />} />
              <Route path="/quote-requests" element={<div>Quote Requests Page</div>} />
              <Route path="/quote-system" element={<QuoteSystem />} />
              <Route path="/settings" element={<div>Settings Page</div>} />
              <Route path="/notifications" element={<div>Notifications Page</div>} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
