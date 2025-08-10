import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
            <Route path="/customer-portal" element={<CustomerPortal />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/products" element={<div>Products Page</div>} />
              <Route path="/customers" element={<div>Customers Page</div>} />
              <Route path="/analytics" element={<div>Analytics Page</div>} />
              <Route path="/quote-requests" element={<div>Quote Requests Page</div>} />
              <Route path="/partners" element={<div>Partners Page</div>} />
              <Route path="/ventures" element={<div>Ventures Page</div>} />
              <Route path="/contact" element={<div>Contact Page</div>} />
              <Route path="/about" element={<div>About Page</div>} />
              <Route path="/settings" element={<div>Settings Page</div>} />
              <Route path="/notifications" element={<div>Notifications Page</div>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
