import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BrandDetailPage from "./pages/BrandDetailPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import BrandFormPage from "./pages/admin/BrandFormPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminGuard from "./components/AdminGuard";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* ── Public routes ── */}
            <Route path="/" element={<Index />} />
            <Route path="/brand/:id" element={<BrandDetailPage />} />

            {/* ── Admin routes (hidden from public nav) ── */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <AdminDashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/brands/new"
              element={
                <AdminGuard>
                  <BrandFormPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/brands/:id/edit"
              element={
                <AdminGuard>
                  <BrandFormPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminGuard>
                  <AdminAnalyticsPage />
                </AdminGuard>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
