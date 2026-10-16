import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import Overview from "./pages/Overview";
import DiamantePage from "./pages/DiamantePage";
import InsightsPage from "./pages/InsightsPage";
import AltaRendaPage from "./pages/AltaRendaPage";
import ComercialPage from "./pages/ComercialPage";
import CentralAlunoPage from "./pages/CentralAlunoPage";
import ExtensaoPage from "./pages/ExtensaoPage";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Overview />} />
            <Route path="/diamante" element={<DiamantePage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/alta-renda" element={<AltaRendaPage />} />
            <Route path="/comercial" element={<ComercialPage />} />
            <Route path="/central-aluno" element={<CentralAlunoPage />} />
            <Route path="/extensao" element={<ExtensaoPage />} />

          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
