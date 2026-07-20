import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { useGestaoCounts } from "@/hooks/useGestaoCounts";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Wrench, Users, LayoutDashboard, LogOut, ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { cn } from "@/lib/utils";

type Tab = {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
  countKey?: "pendingQuotes" | "pendingRmas";
};

const tabsDesktop: Tab[] = [
  { to: "/gestao",            icon: LayoutDashboard, label: "Resumo",     end: true },
  { to: "/gestao/orcamentos", icon: FileText,         label: "Orçamentos", countKey: "pendingQuotes" },
  { to: "/gestao/rma",        icon: Wrench,           label: "RMAs",       countKey: "pendingRmas" },
  { to: "/gestao/clientes",   icon: Users,            label: "Clientes" },
];

const tabsMobile: Tab[] = [
  { to: "/gestao",            icon: LayoutDashboard, label: "Resumo",     end: true },
  { to: "/gestao/orcamentos", icon: FileText,         label: "Orçamentos", countKey: "pendingQuotes" },
  { to: "/gestao/rma",        icon: Wrench,           label: "RMAs",       countKey: "pendingRmas" },
];

function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full",
        "text-[10px] font-bold leading-none tabular-nums",
        "bg-destructive text-destructive-foreground",
        className,
      )}
      aria-label={`${count} novos`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function Gestao() {
  const { user, loading, isGestor, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isGestor) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <>
      <Helmet>
        <title>Gestão Comercial · VRCF</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={vrcfLogo} alt="VRCF" className="h-7 w-auto" />
              <span className="font-heading font-bold hidden sm:inline text-sm text-muted-foreground">
                Gestão Comercial
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Catálogo</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Sair</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Layout principal */}
        <div className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-4 sm:py-6 grid md:grid-cols-[200px_1fr] gap-6">

          {/* Sidebar — só em md+ */}
          <aside className="hidden md:block">
            <nav className="flex flex-col gap-1 sticky top-20">
              {tabsDesktop.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  end={t.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )
                  }
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          {/* Conteúdo */}
          <main className="min-w-0 pb-20 md:pb-0">
            <Outlet />
          </main>
        </div>

        {/* Footer — só em md+ */}
        <div className="hidden md:block">
          <SiteFooter />
        </div>

        {/* Bottom nav mobile — só tabs essenciais */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
          <div className="grid grid-cols-3 h-14">
            {tabsMobile.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center justify-center gap-0.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <t.icon className="h-5 w-5" />
                <span className="text-[9px] font-medium">{t.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
