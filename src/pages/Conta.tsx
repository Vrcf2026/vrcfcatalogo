import { useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import {
  Loader2, LayoutDashboard, FileText, Wrench, UserCog,
  LogOut, ArrowLeft, MapPin, MessageSquare,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { cn } from "@/lib/utils";

export default function Conta() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [contactOpen, setContactOpen] = useState(false);

  // Contadores para badges
  const { data: notifs } = useQuery({
    queryKey: ["conta-notifs", user?.id],
    enabled: !!user,
    refetchInterval: 60 * 1000, // atualiza a cada minuto
    queryFn: async () => {
      const [quotes, rmas] = await Promise.all([
        supabase.from("quotes").select("id", { count: "exact" })
          .eq("user_id", user!.id).eq("status", "sent"),
        supabase.from("rma_requests").select("id", { count: "exact" })
          .eq("user_id", user!.id).in("status", ["approved", "shipped_back"]),
      ]);
      return {
        orcamentos: quotes.count ?? 0,
        rma: rmas.count ?? 0,
      };
    },
  });

  const tabs = [
    { to: "/conta",           icon: LayoutDashboard, label: "Resumo",     end: true,  badge: 0 },
    { to: "/conta/orcamentos",icon: FileText,         label: "Orçamentos", end: false, badge: notifs?.orcamentos ?? 0 },
    { to: "/conta/rma",       icon: Wrench,           label: "RMAs",       end: false, badge: notifs?.rma ?? 0 },
    { to: "/conta/moradas",   icon: MapPin,           label: "Moradas",    end: false, badge: 0 },
    { to: "/conta/dados",     icon: UserCog,          label: "Dados",      end: false, badge: 0 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <>
      <Helmet>
        <title>A Minha Conta · VRCF</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={vrcfLogo} alt="VRCF" className="h-8 w-auto" />
              <span className="font-heading font-bold hidden sm:inline">A Minha Conta</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Catálogo</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-1" /> Sair
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
          <aside>
            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide pb-1 md:pb-0">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors relative",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  {t.label}
                  {t.badge > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                      {t.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* Separador + botão Contactar */}
              <div className="border-t border-border my-2 hidden md:block" />
              <button
                onClick={() => setContactOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                Contactar VRCF
              </button>
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>

        <SiteFooter />
      </div>

      <SuggestionDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
