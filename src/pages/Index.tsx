import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Monitor, ArrowRight, ShoppingCart, Phone, Mail, MapPin,
  Search, Send, Sparkles, Star, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryMeta } from "@/lib/categoryIcons";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

const useCount = (mundo: "seguranca" | "escritorio") =>
  useQuery({
    queryKey: ["product-count", mundo],
    queryFn: async () => {
      const { data: cats } = await supabase
        .from("categories").select("name")
        .eq("visivel", true).in("mundo", [mundo, "todos"]);
      const names = (cats ?? []).map((c: any) => c.name);
      let q = supabase.from("products").select("*", { count: "exact", head: true });
      if (names.length > 0) q = q.in("category", names);
      const { count } = await q;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

const useHighlightedCategories = () =>
  useQuery({
    queryKey: ["highlights-categories-with-mundo"],
    queryFn: async () => {
      const { data: highlights } = await (supabase as any)
        .from("homepage_highlights")
        .select("ref_id, label, position")
        .eq("type", "category").eq("active", true)
        .order("position", { ascending: true });
      const names = (highlights ?? []).map((h: any) => h.ref_id);
      if (names.length === 0) return [] as { name: string; mundo: string }[];
      const { data: cats } = await supabase
        .from("categories").select("name, mundo").in("name", names);
      const mundoByName = new Map<string, string>((cats ?? []).map((c: any) => [c.name, c.mundo ?? "todos"]));
      return (highlights ?? []).map((h: any) => ({
        name: h.label,
        mundo: mundoByName.get(h.ref_id) ?? "todos",
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

const useFeaturedProducts = () =>
  useQuery({
    queryKey: ["homepage-featured-preview"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const segCount = useCount("seguranca");
  const escCount = useCount("escritorio");
  const highlights = useHighlightedCategories();
  const featured = useFeaturedProducts();

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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.1] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        {/* Glow */}
        <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div aria-hidden className="absolute -bottom-32 right-0 h-[300px] w-[600px] rounded-full bg-accent/20 blur-3xl pointer-events-none" />

        <div className="relative container mx-auto px-4 py-14 sm:py-20 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium uppercase tracking-wider">
            <Sparkles className="h-3 w-3" /> Showroom Online
          </span>
          <h1 className="mt-5 font-heading text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
            VRCF Showroom
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Tecnologia e Segurança ao seu alcance.<br className="hidden sm:block" />
            <span className="text-foreground/80">Escolha o seu mundo.</span>
          </p>
        </div>
      </section>

      {/* WORLDS */}
      <section className="container mx-auto px-4 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7">
        <WorldCard
          to="/seguranca"
          icon={ShieldCheck}
          title="Segurança & Redes"
          subtitle="Videovigilância, controlo de acessos, alarmes, redes profissionais e infraestrutura."
          count={segCount.data}
          accentClass="text-primary"
          gradient="from-primary/25 via-primary/5 to-transparent"
          ringColor="hover:border-primary/50"
          blob="bg-primary/15"
        />
        <WorldCard
          to="/escritorio"
          icon={Monitor}
          title="Escritório & IT"
          subtitle="Computadores, periféricos, impressão, consumíveis e mobiliário para o escritório."
          count={escCount.data}
          accentClass="text-blue-500"
          gradient="from-blue-500/25 via-blue-500/5 to-transparent"
          ringColor="hover:border-blue-500/50"
          blob="bg-blue-500/15"
        />
      </section>

      <BrandsStrip />

      {/* FEATURED CATEGORIES */}
      {highlights.data && highlights.data.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-8 max-w-5xl mx-auto">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Categorias em destaque
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
            {highlights.data.map((c) => {
              const meta = getCategoryMeta(c.name);
              const Icon = meta.icon;
              const path = c.mundo === "escritorio" ? "/escritorio" : "/seguranca";
              return (
                <Link
                  key={c.name}
                  to={`${path}?categoria=${encodeURIComponent(c.name)}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${meta.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </p>
                  <ArrowRight className="absolute top-5 right-5 h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS PREVIEW */}
      {featured.data && featured.data.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-8 max-w-6xl mx-auto">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
              <Star className="h-3 w-3 text-primary" /> Produtos em destaque
            </h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {featured.data.slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/produto/${p.slug ?? p.id}`} className="contents">
                <ProductCard
                  id={p.id}
                  name={p.name}
                  description={p.short_description ?? p.description}
                  category={p.category}
                  price={p.price}
                  imageUrl={p.image_url}
                  images={[]}
                  familyName={null}
                  featured={p.featured}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="relative bg-zinc-900 text-white py-16 overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative container mx-auto px-4">
          <h3 className="text-center font-heading text-3xl sm:text-4xl font-bold mb-3">Como funciona</h3>
          <p className="text-center text-zinc-400 mb-12 max-w-xl mx-auto">
            Pedir um orçamento à VRCF é simples e rápido.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: Search, title: "Explore", desc: "Navegue por categoria, marca ou pesquisa rápida.", n: "01" },
              { icon: ShoppingCart, title: "Adicione", desc: "Reúna os produtos no pedido de orçamento.", n: "02" },
              { icon: Send, title: "Receba", desc: "Enviamos a proposta com preços actualizados.", n: "03" },
            ].map((s, i) => (
              <div key={i} className="relative group rounded-2xl border border-white/10 bg-white/[0.03] p-7 hover:bg-white/[0.06] hover:border-primary/40 transition-all">
                <span className="absolute top-4 right-5 font-heading text-5xl font-bold text-white/[0.05] group-hover:text-primary/20 transition-colors">
                  {s.n}
                </span>
                <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-heading font-semibold text-lg">{s.title}</h4>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-accent text-accent-foreground py-10 mt-auto">
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

interface WorldCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  count?: number;
  accentClass: string;
  gradient: string;
  ringColor: string;
  blob: string;
}

const WorldCard = ({ to, icon: Icon, title, subtitle, count, accentClass, gradient, ringColor, blob }: WorldCardProps) => (
  <Link
    to={to}
    className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10 min-h-[340px] flex flex-col justify-between transition-all hover:scale-[1.015] hover:shadow-2xl ${ringColor}`}
  >
    {/* Gradient wash */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
    {/* Decorative dot pattern */}
    <div
      aria-hidden
      className="absolute inset-0 opacity-[0.06] pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(currentColor 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    />
    {/* Blob */}
    <div className={`absolute -right-16 -bottom-16 h-56 w-56 rounded-full ${blob} blur-3xl pointer-events-none transition-all group-hover:scale-125`} />

    <div className="relative">
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 backdrop-blur border border-border shadow-sm mb-5 ${accentClass}`}>
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      <p className="mt-3 text-muted-foreground max-w-md leading-relaxed">{subtitle}</p>
      {count != null && (
        <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/70 border border-border backdrop-blur">
          <Package className={`h-3.5 w-3.5 ${accentClass}`} />
          <span className="text-xs font-semibold">{count} produtos disponíveis</span>
        </div>
      )}
    </div>
    <div className={`relative flex items-center gap-2 font-medium mt-6 ${accentClass}`}>
      Explorar catálogo
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
    </div>
  </Link>
);

export default Index;
