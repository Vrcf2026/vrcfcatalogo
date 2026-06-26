import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, LayoutDashboard, FileText, Wrench, UserCog, LogOut, ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import vrcfLogo from "@/assets/vrcf-logo.png";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/conta", icon: LayoutDashboard, label: "Resumo", end: true },
  { to: "/conta/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/conta/rma", icon: Wrench, label: "RMAs" },
  { to: "/conta/dados", icon: UserCog, label: "Dados" },
];

export default function Conta() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

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

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
