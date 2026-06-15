import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/contexts/CartContext";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Registo from "./pages/Registo.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import Seguranca from "./pages/Seguranca.tsx";
import Escritorio from "./pages/Escritorio.tsx";
import Economato from "./pages/Economato.tsx";
import Produto from "./pages/Produto.tsx";
import TermosCondicoes from "./pages/TermosCondicoes.tsx";
import PoliticaCookies from "./pages/PoliticaCookies.tsx";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade.tsx";
import Pesquisa from "./pages/Pesquisa.tsx";
import Conta from "./pages/Conta.tsx";
import ContaDashboard from "./pages/conta/Dashboard.tsx";
import ContaOrcamentos from "./pages/conta/Orcamentos.tsx";
import OrcamentoDetalhe from "./pages/conta/OrcamentoDetalhe.tsx";
import ContaRMA from "./pages/conta/RMA.tsx";
import ContaDados from "./pages/conta/Dados.tsx";
import { CookieConsentBanner } from "./components/CookieConsentBanner.tsx";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/seguranca" element={<Seguranca />} />
              <Route path="/escritorio" element={<Escritorio />} />
              <Route path="/economato" element={<Economato />} />
              <Route path="/produto/:slug" element={<Produto />} />
              <Route path="/termos-e-condicoes" element={<TermosCondicoes />} />
              <Route path="/politica-de-cookies" element={<PoliticaCookies />} />
              <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
              <Route path="/pesquisa" element={<Pesquisa />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registo" element={<Registo />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/conta" element={<Conta />}>
                <Route index element={<ContaDashboard />} />
                <Route path="orcamentos" element={<ContaOrcamentos />} />
                <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
                <Route path="rma" element={<ContaRMA />} />
                <Route path="dados" element={<ContaDados />} />
              </Route>
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsentBanner />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
