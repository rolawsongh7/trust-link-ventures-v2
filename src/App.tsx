import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { CustomerProtectedRoute } from "@/components/customer/CustomerProtectedRoute";
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
import AdminLogin from "./pages/AdminLogin";
import Cookies from "./pages/Cookies";
import Products from "./pages/Products";
import QuoteRequest from "./pages/QuoteRequest";
import QuoteSystem from "./pages/QuoteSystem";
import Terms from "./pages/Terms";

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
            </Route>
            
            {/* Auth routes (standalone) */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/customer-portal" element={<CustomerPortal />} />
            <Route path="/customer-portal-main" element={
              <CustomerProtectedRoute>
                <CustomerPortalMain />
              </CustomerProtectedRoute>
            } />
            <Route path="/admin-login" element={<AdminLogin />} />
            
            {/* Protected routes */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/customers" element={<div>Customers Page</div>} />
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
