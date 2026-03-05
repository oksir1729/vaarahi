import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "@/hooks/useData";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import DashboardOverview from "./pages/DashboardOverview";
import SalesPage from "./pages/SalesPage";
import ProductsPage from "./pages/ProductsPage";
import SalesmenPage from "./pages/SalesmenPage";
import CategoriesPage from "./pages/CategoriesPage";
import FinancePage from "./pages/FinancePage";
import UploadPage from "./pages/UploadPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DataProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<DashboardLayout><DashboardOverview /></DashboardLayout>} />
            <Route path="/dashboard/finance" element={<DashboardLayout><FinancePage /></DashboardLayout>} />
            <Route path="/dashboard/sales" element={<DashboardLayout><SalesPage /></DashboardLayout>} />
            <Route path="/dashboard/products" element={<DashboardLayout><ProductsPage /></DashboardLayout>} />
            <Route path="/dashboard/salesmen" element={<DashboardLayout><SalesmenPage /></DashboardLayout>} />
            <Route path="/dashboard/categories" element={<DashboardLayout><CategoriesPage /></DashboardLayout>} />
            <Route path="/dashboard/upload" element={<DashboardLayout><UploadPage /></DashboardLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DataProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
