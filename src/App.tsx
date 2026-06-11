import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Seguranca from "./pages/Seguranca";
import Escritorio from "./pages/Escritorio";
import Economato from "./pages/Economato";
import Produto from "./pages/Produto";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Pesquisa from "./pages/Pesquisa";
import TermosCondicoes from "./pages/TermosCondicoes";
import PoliticaCookies from "./pages/PoliticaCookies";
import NotFound from "./pages/NotFound";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/seguranca" element={<Seguranca />} />
        <Route path="/escritorio" element={<Escritorio />} />
        <Route path="/economato" element={<Economato />} />
        <Route path="/produto/:slug" element={<Produto />} />
        <Route path="/termos-e-condicoes" element={<TermosCondicoes />} />
        <Route path="/politica-de-cookies" element={<PoliticaCookies />} />
        <Route path="/pesquisa" element={<Pesquisa />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
