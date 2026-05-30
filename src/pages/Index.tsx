import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Monitor, ArrowRight, ShoppingCart, Phone, Mail, MapPin, Search, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { supabase } from "@/integrations/supabase/client";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

const useCount = (mundo: "seguranca" | "escritorio") =>
  useQuery({
    queryKey: ["product-count", mundo],
    queryFn: async () => {
      // Categories visible for this mundo
      const { data: cats } = await supabase
        .from("categories")
        .select("name")
        .eq("visivel", true)
        .in("mundo", [mundo, "todos"]);
      const names = (cats ?? []).map((c: any) => c.name);
      let q = supabase.from("products").select("*", { count: "exact", head: true });
      if (names.length > 0) q = q.in("category", names);
      const { count } = await q;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const segCount = useCount("seguranca");
  const escCount = useCount("escritorio");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>VRCF Showroom — Segurança, Redes, Escritório &amp; IT | Montijo</title>
        <meta name="description" content="Catálogo profissional VRCF: videovigilância, redes, equipamento informático e soluções de segurança. Peça orçamento online." />
        <link rel="canonical" href="https://showroom.vrcf.info/" />
      </Helmet>

      <WelcomeBanner />

      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3">
          <img src={vrcfLogo} alt="VRCF" className="h-10 sm:h-14 w-auto" />
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" /> Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">{totalItems}</span>
              )}
            </Button>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">Admin</Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-10 sm:py-14 text-center">
        <h1 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight">VRCF Showroom</h1>
        <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          Tecnologia e Segurança ao seu alcance. Escolha o seu mundo.
        </p>
      </section>

      <section className="container mx-auto px-4 pb-16 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 flex-1">
        <Link
          to="/seguranca"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-8 sm:p-12 min-h-[320px] flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-primary/40"
        >
          <div>
            <ShieldCheck className="h-12 w-12 text-primary mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Segurança &amp; Redes</h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Videovigilância, controlo de acessos, alarmes, redes profissionais e infraestrutura.
            </p>
            {segCount.data != null && (
              <p className="mt-4 text-sm font-medium text-primary">{segCount.data} produtos disponíveis</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-primary font-medium mt-6">
            Explorar catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        </Link>

        <Link
          to="/escritorio"
          className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-blue-500/15 via-card to-card p-8 sm:p-12 min-h-[320px] flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-blue-500/40"
        >
          <div>
            <Monitor className="h-12 w-12 text-blue-500 mb-4" />
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">Escritório &amp; IT</h2>
            <p className="mt-3 text-muted-foreground max-w-md">
              Computadores, periféricos, impressão, consumíveis e mobiliário para o escritório.
            </p>
            {escCount.data != null && (
              <p className="mt-4 text-sm font-medium text-blue-500">{escCount.data} produtos disponíveis</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-blue-500 font-medium mt-6">
            Explorar catálogo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        </Link>
      </section>

      <BrandsStrip />

      {/* How it works */}
      <section className="bg-zinc-900 text-white py-12">
        <div className="container mx-auto px-4">
          <h3 className="text-center font-heading text-2xl sm:text-3xl font-bold mb-10">Como funciona</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Search, title: "1. Explore", desc: "Navegue por categoria, marca ou pesquisa rápida." },
              { icon: ShoppingCart, title: "2. Adicione", desc: "Adicione os produtos ao seu pedido de orçamento." },
              { icon: Send, title: "3. Receba", desc: "Enviamos a proposta com preços actualizados." },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-3">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold">{s.title}</h4>
                <p className="text-sm text-zinc-400 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-accent text-accent-foreground py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={vrcfShield} alt="VRCF" className="h-12 w-auto" />
            <div>
              <p className="font-heading font-bold text-sm">VRCF — Informática &amp; Segurança</p>
              <p className="text-xs text-accent-foreground/70">NIF 515237205 · Montijo</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="tel:+351911564243" className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-3.5 w-3.5" /> +351 911 564 243</a>
            <a href="mailto:geral@vrcf.pt" className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-3.5 w-3.5" /> geral@vrcf.pt</a>
            <a href="https://maps.google.com/?q=Rua+Luis+Calado+Nunes+15+Montijo" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary"><MapPin className="h-3.5 w-3.5" /> Rua Luis Calado Nunes 15 LJ B, Montijo</a>
          </div>
          <div className="text-xs space-x-3">
            <Link to="/termos-e-condicoes" className="text-primary hover:underline">Termos</Link>
            <Link to="/politica-de-cookies" className="text-primary hover:underline">Cookies</Link>
            <button onClick={() => setSuggestionOpen(true)} className="text-primary hover:underline inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Sugestão</button>
          </div>
        </div>
      </footer>

      <CartDrawer />
      <ContactFloatingBubble />
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </div>
  );
};

export default Index;
