import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import CRM from "./pages/CRM";
import CustomerPortal from "./pages/CustomerPortal";
import AdminLogin from "./pages/AdminLogin";
import Cookies from "./pages/Cookies";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/customer-portal" element={<CustomerPortal />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/products" element={<div>Products Page</div>} />
              <Route path="/customers" element={<div>Customers Page</div>} />
              <Route path="/quote-requests" element={<div>Quote Requests Page</div>} />
              <Route path="/partners" element={<div>Partners Page</div>} />
              <Route path="/ventures" element={<div>Ventures Page</div>} />
              <Route path="/about" element={<div>About Page</div>} />
              <Route path="/settings" element={<div>Settings Page</div>} />
              <Route path="/notifications" element={<div>Notifications Page</div>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
