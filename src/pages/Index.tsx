import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck, Monitor, ArrowRight, ShoppingCart, Phone, Mail, MapPin,
  Search, Send, Sparkles, Star, Package, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import BrandsStrip from "@/components/BrandsStrip";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import { CartDrawer } from "@/components/CartDrawer";
import { ProductCard } from "@/components/ProductCard";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { useCart } from "@/contexts/CartContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SuggestionDialog } from "@/components/SuggestionDialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryMeta } from "@/lib/categoryIcons";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

const useCount = (mundo: "seguranca" | "escritorio") =>
  useQuery({
    queryKey: ["product-count", mundo],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("mundo", mundo)
        .eq("include_in_catalog", true);
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
        .eq("show_on_homepage", true)
        .eq("include_in_catalog", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (data && data.length > 0) return data;
      const { data: fallback } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .eq("include_in_catalog", true)
        .order("created_at", { ascending: false })
        .limit(8);
      return fallback ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const useBanners = () =>
  useQuery({
    queryKey: ["banners-homepage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("ativo", true)
        .in("mundo", ["todos"])
        .order("ordem");
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

const Index = () => {
  const { totalItems, setIsOpen } = useCart();
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [bannerIdx, setBannerIdx] = useState(0);
  const navigate = useNavigate();
  const segCount = useCount("seguranca");
  const escCount = useCount("escritorio");
  const highlights = useHighlightedCategories();
  const featured = useFeaturedProducts();
  const banners = useBanners();
  const timerRef = useRef<any>(null);

  // Carrossel automático
  useEffect(() => {
    if (!banners.data || banners.data.length <= 1) return;
    timerRef.current = setInterval(() => {
      setBannerIdx(i => (i + 1) % banners.data.length);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [banners.data]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (!q) return;
    navigate(`/pesquisa?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>VRCF Showroom — Segurança, Redes, Escritório &amp; IT | Montijo</title>
        <meta name="description" content="Catálogo profissional VRCF: videovigilância, redes, equipamento informático e soluções de segurança. Peça orçamento online." />
        <link rel="canonical" href="https://showroom.vrcf.info/" />
      </Helmet>

      <WelcomeBanner />

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <Link to="/" className="shrink-0">
            <img src={vrcfLogo} alt="VRCF" className="h-10 sm:h-14 w-auto" />
          </Link>
          <form onSubmit={submitSearch} className="relative flex-1 max-w-xl mx-auto hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar em todo o catálogo..." value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)} className="pl-10 bg-card" />
          </form>
          <div className="flex items-center gap-2 shrink-0">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5 h-9" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orçamento</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">{totalItems}</span>
              )}
            </Button>
            <Link to="/login" className="hidden sm:inline text-xs text-muted-foreground hover:text-foreground">Admin</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background to-muted/30">
        <div aria-hidden className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "40px 40px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)" }} />
        <div className="relative container mx-auto px-4 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Sparkles className="h-3 w-3" /> Showroom Online · Montijo
          </div>
          <h1 className="mt-4 font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
            VRCF Showroom
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            Tecnologia e Segurança para empresas e particulares.
          </p>
          <form onSubmit={submitSearch} className="relative mt-6 max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Pesquisar câmaras, portáteis, switches..."
              value={heroQuery} onChange={(e) => setHeroQuery(e.target.value)}
              className="pl-12 pr-28 h-13 text-base bg-card border-border shadow-sm rounded-2xl" />
            <Button type="submit" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 rounded-xl">
              Pesquisar
            </Button>
          </form>
        </div>
      </section>

      {/* BANNERS */}
      {banners.data && banners.data.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="relative rounded-2xl overflow-hidden">
            {banners.data.map((b: any, i: number) => (
              <div key={b.id} className={`transition-opacity duration-500 ${i === bannerIdx ? "opacity-100" : "opacity-0 absolute inset-0"}`}>
                {b.link ? (
                  <Link to={b.link}>
                    <img src={b.image_url} alt={b.titulo || "Banner"} className="w-full object-cover rounded-2xl max-h-64" />
                  </Link>
                ) : (
                  <img src={b.image_url} alt={b.titulo || "Banner"} className="w-full object-cover rounded-2xl max-h-64" />
                )}
              </div>
            ))}
            {banners.data.length > 1 && (
              <>
                <button onClick={() => setBannerIdx(i => (i - 1 + banners.data.length) % banners.data.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setBannerIdx(i => (i + 1) % banners.data.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 border border-border flex items-center justify-center hover:bg-background transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {banners.data.map((_: any, i: number) => (
                    <button key={i} onClick={() => setBannerIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? "w-6 bg-primary" : "w-1.5 bg-background/60"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* WORLD CARDS */}
      <section className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        <WorldCard
          to="/seguranca"
          mundo="seguranca"
          title="Segurança & Redes"
          subtitle="Videovigilância, controlo de acessos, alarmes e redes profissionais."
          count={segCount.data}
        />
        <WorldCard
          to="/escritorio"
          mundo="escritorio"
          title="Escritório & IT"
          subtitle="Computadores recondicionados, periféricos e soluções IT para empresas."
          count={escCount.data}
        />
      </section>

      <BrandsStrip />

      {/* CATEGORIAS DESTAQUE */}
      {highlights.data && highlights.data.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <SectionTitle>Categorias em destaque</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto mt-6">
            {highlights.data.map((c) => {
              const meta = getCategoryMeta(c.name);
              const Icon = meta.icon;
              const path = c.mundo === "escritorio" ? "/escritorio" : "/seguranca";
              return (
                <Link key={c.name} to={`${path}?categoria=${encodeURIComponent(c.name)}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md transition-all">
                  <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${meta.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">{c.name}</p>
                  <ArrowRight className="absolute top-4 right-4 h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* PRODUTOS EM DESTAQUE */}
      {featured.data && featured.data.length > 0 && (
        <section className="container mx-auto px-4 py-10">
          <SectionTitle icon={<Star className="h-3.5 w-3.5 text-primary" />}>Produtos em destaque</SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mt-6">
            {featured.data.slice(0, 8).map((p: any) => (
              <Link key={p.id} to={`/produto/${p.slug ?? p.id}`} className="contents">
                <ProductCard
                  id={p.id} name={p.name}
                  description={p.short_description ?? p.description}
                  category={p.category} price={p.price}
                  imageUrl={p.image_url} images={[]}
                  familyName={null} featured={p.featured}
                />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* COMO FUNCIONA */}
      <section className="relative bg-zinc-900 dark:bg-zinc-950 text-white py-16 overflow-hidden mt-8">
        <div aria-hidden className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative container mx-auto px-4">
          <h3 className="text-center font-heading text-3xl sm:text-4xl font-bold mb-2">Como funciona</h3>
          <p className="text-center text-zinc-400 mb-10 max-w-lg mx-auto text-sm">Pedir um orçamento à VRCF é simples e rápido.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              { icon: Search, title: "Explore", desc: "Navegue por categoria, marca ou pesquisa rápida.", n: "01" },
              { icon: ShoppingCart, title: "Adicione", desc: "Reúna os produtos no pedido de orçamento.", n: "02" },
              { icon: Send, title: "Receba", desc: "Enviamos a proposta com preços actualizados.", n: "03" },
            ].map((s, i) => (
              <div key={i} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06] hover:border-primary/40 transition-all relative">
                <span className="absolute top-4 right-5 font-heading text-4xl font-bold text-white/[0.05] group-hover:text-primary/20 transition-colors">{s.n}</span>
                <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-heading font-semibold text-base mb-1">{s.title}</h4>
                <p className="text-sm text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-muted/30 py-10 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={vrcfShield} alt="VRCF" className="h-11 w-auto" />
            <div>
              <p className="font-heading font-bold text-sm">VRCF — Informática &amp; Segurança</p>
              <p className="text-xs text-muted-foreground">NIF 515237205 · Montijo</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a href="tel:+351911564243" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Phone className="h-3.5 w-3.5" /> +351 911 564 243
            </a>
            <a href="mailto:geral@vrcf.pt" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <Mail className="h-3.5 w-3.5" /> geral@vrcf.pt
            </a>
            <a href="https://maps.google.com/?q=Rua+Luis+Calado+Nunes+15+Montijo" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
              <MapPin className="h-3.5 w-3.5" /> Rua Luis Calado Nunes 15 LJ B, Montijo
            </a>
          </div>
          <div className="text-xs space-x-3 text-muted-foreground">
            <Link to="/termos-e-condicoes" className="hover:text-primary transition-colors">Termos</Link>
            <Link to="/politica-de-cookies" className="hover:text-primary transition-colors">Cookies</Link>
            <button onClick={() => setSuggestionOpen(true)} className="hover:text-primary transition-colors inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Sugestão
            </button>
          </div>
        </div>
      </footer>

      <CartDrawer />
      <ContactFloatingBubble />
      <SuggestionDialog open={suggestionOpen} onOpenChange={setSuggestionOpen} />
    </div>
  );
};

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 max-w-5xl mx-auto">
      <div className="h-px flex-1 bg-border" />
      <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
        {icon}{children}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function WorldCard({ to, mundo, title, subtitle, count }: {
  to: string; mundo: "seguranca" | "escritorio"; title: string; subtitle: string; count?: number;
}) {
  const isSeguranca = mundo === "seguranca";
  return (
    <Link to={to} className={`group relative overflow-hidden rounded-3xl border border-border bg-card min-h-[320px] flex flex-col justify-between transition-all hover:scale-[1.012] hover:shadow-2xl hover:border-primary/40`}>

      {/* Ilustração SVG de fundo */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        {isSeguranca ? <SecurityIllustration /> : <OfficeIllustration />}
      </div>

      {/* Gradiente de leitura */}
      <div className={`absolute inset-0 ${isSeguranca
        ? "bg-gradient-to-t from-orange-950/90 via-orange-900/50 to-orange-900/10"
        : "bg-gradient-to-t from-blue-950/90 via-blue-900/50 to-blue-900/10"
      } rounded-3xl`} />

      {/* Conteúdo */}
      <div className="relative p-7 sm:p-9 flex flex-col h-full justify-end">
        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border mb-4 ${isSeguranca ? "bg-orange-500/20 border-orange-400/30 text-orange-300" : "bg-blue-500/20 border-blue-400/30 text-blue-300"}`}>
          {isSeguranca ? <ShieldCheck className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/70 max-w-xs leading-relaxed">{subtitle}</p>
        {count != null && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur w-fit">
            <Package className="h-3.5 w-3.5 text-white/70" />
            <span className="text-xs font-semibold text-white">{count} produtos disponíveis</span>
          </div>
        )}
        <div className={`flex items-center gap-2 font-semibold mt-5 text-sm ${isSeguranca ? "text-orange-300" : "text-blue-300"}`}>
          Explorar catálogo
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

function SecurityIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      {/* Background */}
      <rect width="600" height="320" fill="#1a0a00" />
      {/* Grid lines */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <line key={`h${i}`} x1="0" y1={i*28} x2="600" y2={i*28} stroke="#E87722" strokeOpacity="0.06" strokeWidth="0.5" />
      ))}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(i => (
        <line key={`v${i}`} x1={i*32} y1="0" x2={i*32} y2="320" stroke="#E87722" strokeOpacity="0.06" strokeWidth="0.5" />
      ))}
      {/* Camera dome - centro direita */}
      <ellipse cx="420" cy="130" rx="52" ry="20" fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1.5" />
      <rect x="400" y="130" width="40" height="28" rx="4" fill="#E87722" fillOpacity="0.2" stroke="#E87722" strokeOpacity="0.5" strokeWidth="1.5" />
      <ellipse cx="420" cy="135" rx="10" ry="10" fill="#E87722" fillOpacity="0.4" stroke="#E87722" strokeWidth="1.5" />
      <circle cx="420" cy="135" r="5" fill="#E87722" fillOpacity="0.8" />
      {/* Camera lens shine */}
      <circle cx="416" cy="131" r="2" fill="white" fillOpacity="0.3" />
      {/* Camera mount */}
      <rect x="417" y="158" width="6" height="20" rx="2" fill="#E87722" fillOpacity="0.4" />
      {/* Signal waves from camera */}
      {[1,2,3].map(i => (
        <ellipse key={`wave${i}`} cx="420" cy="120" rx={20+i*18} ry={10+i*9}
          fill="none" stroke="#E87722" strokeOpacity={0.25 - i*0.07} strokeWidth="1" strokeDasharray="4 3" />
      ))}
      {/* Shield icon - centro esquerda */}
      <path d="M120 80 L155 68 L190 80 L190 125 Q190 148 155 160 Q120 148 120 125 Z"
        fill="#E87722" fillOpacity="0.12" stroke="#E87722" strokeOpacity="0.5" strokeWidth="1.5" />
      <path d="M136 114 L148 126 L174 100" fill="none" stroke="#E87722" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Network nodes */}
      <circle cx="300" cy="200" r="8" fill="#E87722" fillOpacity="0.3" stroke="#E87722" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="240" cy="240" r="6" fill="#E87722" fillOpacity="0.2" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="360" cy="240" r="6" fill="#E87722" fillOpacity="0.2" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="180" cy="210" r="5" fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.3" strokeWidth="1" />
      <circle cx="440" cy="220" r="5" fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.3" strokeWidth="1" />
      {/* Network connections */}
      <line x1="300" y1="200" x2="240" y2="240" stroke="#E87722" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="5 3" />
      <line x1="300" y1="200" x2="360" y2="240" stroke="#E87722" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="5 3" />
      <line x1="240" y1="240" x2="180" y2="210" stroke="#E87722" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 3" />
      <line x1="360" y1="240" x2="440" y2="220" stroke="#E87722" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 3" />
      <line x1="300" y1="200" x2="420" y2="158" stroke="#E87722" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 3" />
      {/* Lock icon - canto inferior */}
      <rect x="270" y="265" width="60" height="40" rx="6" fill="#E87722" fillOpacity="0.15" stroke="#E87722" strokeOpacity="0.4" strokeWidth="1.5" />
      <path d="M285 265 Q285 248 300 248 Q315 248 315 265" fill="none" stroke="#E87722" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="300" cy="282" r="5" fill="#E87722" fillOpacity="0.6" />
      <rect x="298" y="282" width="4" height="8" rx="1" fill="#E87722" fillOpacity="0.5" />
      {/* Floating dots */}
      {[[50,50],[530,80],[80,270],[510,260],[300,50],[500,170]].map(([x,y], i) => (
        <circle key={`dot${i}`} cx={x} cy={y} r="2" fill="#E87722" fillOpacity="0.3" />
      ))}
    </svg>
  );
}

function OfficeIllustration() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      {/* Background */}
      <rect width="600" height="320" fill="#00091a" />
      {/* Grid */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <line key={`h${i}`} x1="0" y1={i*28} x2="600" y2={i*28} stroke="#3B82F6" strokeOpacity="0.06" strokeWidth="0.5" />
      ))}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(i => (
        <line key={`v${i}`} x1={i*32} y1="0" x2={i*32} y2="320" stroke="#3B82F6" strokeOpacity="0.06" strokeWidth="0.5" />
      ))}
      {/* Monitor - centro */}
      <rect x="230" y="80" width="140" height="95" rx="6" fill="#3B82F6" fillOpacity="0.12" stroke="#3B82F6" strokeOpacity="0.5" strokeWidth="1.5" />
      <rect x="238" y="88" width="124" height="72" rx="3" fill="#3B82F6" fillOpacity="0.08" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="0.5" />
      {/* Screen content - code lines */}
      {[0,1,2,3,4].map(i => (
        <rect key={`line${i}`} x={248 + (i%2)*10} y={96 + i*12} width={60 + (i%3)*20} height="3" rx="1.5"
          fill="#3B82F6" fillOpacity={0.4 - i*0.05} />
      ))}
      <rect x="248" y="148" width="30" height="6" rx="3" fill="#3B82F6" fillOpacity="0.6" />
      {/* Monitor stand */}
      <rect x="293" y="175" width="14" height="16" rx="2" fill="#3B82F6" fillOpacity="0.3" />
      <rect x="280" y="191" width="40" height="5" rx="2" fill="#3B82F6" fillOpacity="0.25" />
      {/* Laptop - esquerda */}
      <rect x="80" y="145" width="110" height="70" rx="4" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1.5" />
      <rect x="88" y="153" width="94" height="54" rx="2" fill="#3B82F6" fillOpacity="0.06" />
      {[0,1,2].map(i => (
        <rect key={`lline${i}`} x={96} y={162 + i*10} width={50 + i*15} height="2.5" rx="1.25" fill="#3B82F6" fillOpacity="0.3" />
      ))}
      <rect x="80" y="215" width="110" height="8" rx="2" fill="#3B82F6" fillOpacity="0.15" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1" />
      {/* Keyboard hint */}
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <rect key={`key${i}`} x={88 + i*11} y="219" width="8" height="4" rx="1" fill="#3B82F6" fillOpacity="0.15" />
      ))}
      {/* CPU/server - direita */}
      <rect x="420" y="100" width="70" height="110" rx="6" fill="#3B82F6" fillOpacity="0.1" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1.5" />
      {[0,1,2,3,4].map(i => (
        <rect key={`slot${i}`} x="430" y={112 + i*17} width="50" height="10" rx="2"
          fill="#3B82F6" fillOpacity="0.15" stroke="#3B82F6" strokeOpacity="0.2" strokeWidth="0.5" />
      ))}
      <circle cx="455" cy="195" r="5" fill="#3B82F6" fillOpacity="0.3" stroke="#3B82F6" strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="452" cy="193" r="1.5" fill="white" fillOpacity="0.2" />
      {/* Connection lines */}
      <line x1="190" y1="180" x2="230" y2="130" stroke="#3B82F6" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 3" />
      <line x1="370" y1="130" x2="420" y2="150" stroke="#3B82F6" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="5 3" />
      {/* Chip/processor icon - canto superior */}
      <rect x="460" y="40" width="60" height="60" rx="4" fill="#3B82F6" fillOpacity="0.08" stroke="#3B82F6" strokeOpacity="0.3" strokeWidth="1" />
      <rect x="472" y="52" width="36" height="36" rx="3" fill="#3B82F6" fillOpacity="0.12" stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1" />
      <rect x="480" y="60" width="20" height="20" rx="2" fill="#3B82F6" fillOpacity="0.2" />
      {[0,1,2].map(i => (
        <line key={`pin${i}`} x1={464} y1={58 + i*10} x2={472} y2={58 + i*10} stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1" />
      ))}
      {[0,1,2].map(i => (
        <line key={`pin2${i}`} x1={508} y1={58 + i*10} x2={520} y2={58 + i*10} stroke="#3B82F6" strokeOpacity="0.4" strokeWidth="1" />
      ))}
      {/* Floating dots */}
      {[[40,40],[560,60],[60,280],[540,270],[300,30],[400,260]].map(([x,y], i) => (
        <circle key={`dot${i}`} cx={x} cy={y} r="2" fill="#3B82F6" fillOpacity="0.25" />
      ))}
      {/* Glow accent */}
      <ellipse cx="300" cy="160" rx="150" ry="80" fill="#3B82F6" fillOpacity="0.04" />
    </svg>
  );
}

export default Index;
